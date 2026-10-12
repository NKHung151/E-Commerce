import logging
import requests
from django.conf import settings
from tenacity import retry, stop_after_attempt, wait_fixed, retry_if_exception_type

logger = logging.getLogger(__name__)

PRODUCT_SERVICE_URL = getattr(settings, 'PRODUCT_SERVICE_URL', 'http://product-service:8002')


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
        if resp.status_code == 404:
            return None
        # 5xx and other unexpected codes are treated as transient so they get retried
        # instead of being reported to the user as "product not found".
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        logger.error(f'[order-service] get_product({product_id}) failed: {e}')
        raise

