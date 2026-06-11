import pytest
from app.utils.http_client import HTTPClient
import httpx

@pytest.mark.asyncio
async def test_http_client_singleton():
    # Ensure it's not initialized yet
    with pytest.raises(RuntimeError):
        HTTPClient.get_client()

    # Initialize
    await HTTPClient.start()
    client = HTTPClient.get_client()
    assert isinstance(client, httpx.AsyncClient)

    # Ensure it's a singleton
    client2 = HTTPClient.get_client()
    assert client is client2

    # Stop
    await HTTPClient.stop()
    with pytest.raises(RuntimeError):
        HTTPClient.get_client()
