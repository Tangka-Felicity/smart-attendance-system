from typing import Optional
import httpx

class HTTPClient:
    client: Optional[httpx.AsyncClient] = None

    @classmethod
    async def start(cls):
        if cls.client is None:
            cls.client = httpx.AsyncClient(timeout=30.0)
        return cls.client

    @classmethod
    async def stop(cls):
        if cls.client:
            await cls.client.aclose()
            cls.client = None

    @classmethod
    def get_client(cls) -> httpx.AsyncClient:
        if cls.client is None:
            raise RuntimeError("HTTPClient is not initialized. Call start() first.")
        return cls.client
