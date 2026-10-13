import logging

import httpx
from config import settings

logger = logging.getLogger(__name__)


class OrderClient:
    def __init__(self):
        self.base_url = settings.ORDER_SERVICE_URL

    async def get_user_orders(self, token: str) -> list:
        """Orders of the user identified by `token` (order-service filters by the JWT), newest first."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{self.base_url}/api/v1/orders/", headers={"Authorization": f"Bearer {token}"})
            if resp.status_code != 200:
                return []
            data = resp.json()
            return data.get("results", []) if isinstance(data, dict) else data
        except httpx.HTTPError as e:
            logger.warning(f"order-service unreachable: {e}")
            return []


order_client = OrderClient()
