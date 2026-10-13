import asyncio
import time
import httpx
from config import settings

ALL_PRODUCTS_CACHE_TTL = 60  # seconds
PAGE_SIZE = 100  # product-service max_page_size


def category_name(product: dict, default: str = "General") -> str:
    """product-service returns `category` as an int id plus `category_name`;
    older payloads used a nested {"id", "name"} dict. Support both."""
    cat = product.get("category")
    if isinstance(cat, dict):
        return cat.get("name") or default
    return product.get("category_name") or default


def category_id(product: dict):
    cat = product.get("category")
    return cat.get("id") if isinstance(cat, dict) else cat


class ProductClient:
    def __init__(self):
        self.base_url = settings.PRODUCT_SERVICE_URL
        self._all_cache = None
        self._all_cache_at = 0.0
        self._all_lock = asyncio.Lock()

    def _internal_url(self, next_url: str) -> str:
        # DRF builds absolute `next` links from the Host header, which may be the
        # gateway's public name; rewrite it to the internal product-service URL.
        for public in ("http://localhost:8080", "http://gateway:8080"):
            if next_url.startswith(public):
                return self.base_url + next_url[len(public):]
        return next_url

    async def _fetch_all_products(self) -> list:
        all_products = []
        url = f"{self.base_url}/api/v1/products/?page_size={PAGE_SIZE}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            while url:
                resp = await client.get(url)
                resp.raise_for_status()
                data = resp.json()
                if isinstance(data, dict) and "results" in data:
                    all_products.extend(data["results"])
                    next_url = data.get("next")
                    url = self._internal_url(next_url) if next_url else None
                elif isinstance(data, list):
                    all_products.extend(data)
                    url = None
                else:
                    break
        return all_products

    async def get_all_products(self, fresh: bool = False) -> list:
        """Full catalogue, cached briefly: several fallback paths call this per request."""
        async with self._all_lock:
            if not fresh and self._all_cache is not None and time.monotonic() - self._all_cache_at < ALL_PRODUCTS_CACHE_TTL:
                return self._all_cache
            self._all_cache = await self._fetch_all_products()
            self._all_cache_at = time.monotonic()
            return self._all_cache

    async def get_product(self, product_id: int):
        """Return the product dict, or None if it does not exist."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{self.base_url}/api/v1/products/{product_id}/")
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return resp.json()

    def _cached_catalogue(self):
        fresh = self._all_cache is not None and time.monotonic() - self._all_cache_at < ALL_PRODUCTS_CACHE_TTL
        return {p["id"]: p for p in self._all_cache} if fresh else None

    async def get_products_by_ids(self, product_ids: list) -> list:
        """Products in input order. Served from the catalogue cache when it is warm
        (product-service asks /recommend for 50 ids on every catalogue page); otherwise
        fetched concurrently."""
        cached = self._cached_catalogue() or {}
        missing = [pid for pid in product_ids if pid not in cached]
        fetched = {p["id"]: p for p in await self._fetch_many(missing)} if missing else {}
        return [cached.get(pid) or fetched[pid] for pid in product_ids if pid in cached or pid in fetched]

    async def _fetch_many(self, product_ids: list) -> list:
        async with httpx.AsyncClient(timeout=10.0) as client:
            async def _one(pid):
                try:
                    resp = await client.get(f"{self.base_url}/api/v1/products/{pid}/")
                    if resp.status_code == 200:
                        return resp.json()
                except httpx.HTTPError:
                    pass
                return None

            results = await asyncio.gather(*(_one(pid) for pid in product_ids))
        return [p for p in results if p is not None]


product_client = ProductClient()
