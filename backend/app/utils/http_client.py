import httpx
from typing import Optional

class HTTPClient:
    client: Optional[httpx.AsyncClient] = None

    @classmethod
    async def get_client(cls) -> httpx.AsyncClient:
        if cls.client is None:
            cls.client = httpx.AsyncClient(timeout=30.0)
        return cls.client

    @classmethod
    async def close_client(cls):
        if cls.client:
            await cls.client.aclose()
            cls.client = None
