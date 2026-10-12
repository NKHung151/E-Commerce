import httpx
from config import settings

class OrderClient:
    def __init__(self):
        self.base_url = settings.ORDER_SERVICE_URL if hasattr(settings, 'ORDER_SERVICE_URL') else "http://order-service:8004"

    async def get_user_orders(self, user_id: int, token: str = None) -> list:
        try:
            headers = {"Authorization": f"Bearer {token}"} if token else {}
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Gọi trực tiếp vào endpoint list của order-service (nó đã tự filter theo user trong token)
                resp = await client.get(f"{self.base_url}/api/v1/orders/", headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    # DRF pagination trả về results
                    return data.get("results", data) if isinstance(data, dict) else data
                return []
        except Exception as e:
            print(f"OrderClient Error: {e}")
            return []


order_client = OrderClient()
