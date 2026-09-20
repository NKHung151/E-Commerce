import logging
import requests
from django.conf import settings
from tenacity import retry, stop_after_attempt, wait_fixed, retry_if_exception_type

logger = logging.getLogger(__name__)

PRODUCT_SERVICE_URL = getattr(settings, 'PRODUCT_SERVICE_URL', 'http://product-service:8002')
PAYMENT_SERVICE_URL = getattr(settings, 'PAYMENT_SERVICE_URL', 'http://payment-service:8005')
SHIPPING_SERVICE_URL = getattr(settings, 'SHIPPING_SERVICE_URL', 'http://shipping-service:8006')


@retry(
    stop=stop_after_attempt(3),
    wait=wait_fixed(1),
    retry=retry_if_exception_type(requests.RequestException),
    reraise=True,
)
def get_product(product_id: int) -> dict | None:
    """Fetch product from product-service. Returns None if not found."""
    try:
        resp = requests.get(
            f'{PRODUCT_SERVICE_URL}/api/v1/products/{product_id}/',
            timeout=5,
        )
        if resp.status_code == 200:
            return resp.json()
        return None
    except requests.RequestException as e:
        logger.error(f'[order-service] get_product({product_id}) failed: {e}')
        raise


@retry(stop=stop_after_attempt(2), wait=wait_fixed(2), reraise=True)
def call_payment(order_id: int, amount, token: str) -> dict:
    """Trigger payment for an order via payment-service."""
    resp = requests.post(
        f'{PAYMENT_SERVICE_URL}/api/v1/payment/pay/',
        json={'order_id': order_id, 'amount': str(amount)},
        headers={'Authorization': f'Bearer {token}'},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


@retry(stop=stop_after_attempt(2), wait=wait_fixed(2), reraise=True)
def call_create_shipment(order_id: int, address: str, token: str) -> dict:
    """Create shipment after successful payment."""
    resp = requests.post(
        f'{SHIPPING_SERVICE_URL}/api/v1/shipping/create/',
        json={'order_id': order_id, 'address': address},
        headers={'Authorization': f'Bearer {token}'},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


def call_reduce_stock(product_id: int, quantity: int, token: str) -> dict:
    resp = requests.post(
        f'{PRODUCT_SERVICE_URL}/api/v1/products/{product_id}/reduce_stock/',
        json={'quantity': quantity},
        headers={'Authorization': f'Bearer {token}'},
        timeout=5
    )
    resp.raise_for_status()
    return resp.json()


def call_refund(order_id: int, token: str) -> dict:
    """Refund a processed payment (compensation step)."""
    resp = requests.post(
        f'{PAYMENT_SERVICE_URL}/api/v1/payment/refund/',
        json={'order_id': order_id},
        headers={'Authorization': f'Bearer {token}'},
        timeout=5
    )
    resp.raise_for_status()
    return resp.json()


def call_rollback_stock(product_id: int, quantity: int, token: str) -> dict:
    """Rollback product stock deduction (compensation step)."""
    resp = requests.post(
        f'{PRODUCT_SERVICE_URL}/api/v1/products/{product_id}/rollback_stock/',
        json={'quantity': quantity},
        headers={'Authorization': f'Bearer {token}'},
        timeout=5
    )
    resp.raise_for_status()
    return resp.json()
