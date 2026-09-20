import httpx
from config import settings

class ProductClient:
    def __init__(self):
        self.base_url = settings.PRODUCT_SERVICE_URL

    async def get_all_products(self) -> list:
        all_products = []
        url = f"{self.base_url}/api/v1/products/"
        async with httpx.AsyncClient(timeout=30.0) as client:
            while url:
                # Sometimes base_url inside container might resolve to localhost/gateway/etc. 
                # Let's ensure url resolves correctly. If it returns absolute URL with host gateway/localhost, 
                # we should use it but we might need to swap the host if it's not accessible.
                # Usually Django PAGINATION returns full URL including domain name.
                # If Django returns host name that is not accessible from ai-service container, 
                # we should replace that part of the URL with settings.PRODUCT_SERVICE_URL or relative path.
                resp = await client.get(url)
                resp.raise_for_status()
                data = resp.json()
                if isinstance(data, dict) and "results" in data:
                    all_products.extend(data["results"])
                    # If 'next' contains the gateway hostname from outside (e.g. localhost:8080),
                    # we should replace it with settings.PRODUCT_SERVICE_URL or gateway internal IP if needed.
                    # Let's inspect 'next' URL first.
                    next_url = data.get("next")
                    if next_url and "localhost:8080" in next_url:
                        next_url = next_url.replace("http://localhost:8080", settings.PRODUCT_SERVICE_URL)
                    elif next_url and "gateway:8080" in next_url:
                        # Map gateway:8080 to product-service internal URL
                        next_url = next_url.replace("http://gateway:8080/api/v1", self.base_url + "/api/v1")
                    url = next_url
                elif isinstance(data, list):
                    all_products.extend(data)
                    url = None
                else:
                    break
        return all_products


    async def get_product(self, product_id: int) -> dict:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{self.base_url}/api/v1/products/{product_id}/")
            resp.raise_for_status()
            return resp.json()

    async def get_products_by_ids(self, product_ids: list) -> list:
        results = []
        async with httpx.AsyncClient(timeout=10.0) as client:
            for pid in product_ids:
                try:
                    resp = await client.get(f"{self.base_url}/api/v1/products/{pid}/")
                    if resp.status_code == 200:
                        results.append(resp.json())
                except Exception:
                    pass
        return results

product_client = ProductClient()
