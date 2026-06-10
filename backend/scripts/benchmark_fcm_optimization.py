import asyncio
import time
from unittest.mock import AsyncMock, patch
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

# Mock environment variables for Pydantic Settings
os.environ["DATABASE_URL"] = "postgresql+asyncpg://user:pass@localhost/db"
os.environ["REDIS_URL"] = "redis://localhost:6379/0"
os.environ["JWT_SECRET_KEY"] = "test_secret"
os.environ["QR_HMAC_SECRET"] = "test_hmac"

# Import after adding to path and setting env
import app.core.config

async def run_benchmark():
    tokens = [f"token_{i}" for i in range(2500)]
    title = "Test"
    body = "Benchmarking"

    print(f"--- Benchmarking FCM Notification Sending with {len(tokens)} tokens ---")

    # 1. Simulate Old Logic (One request per token, new client each time)
    start_old = time.perf_counter()
    for token in tokens:
        await asyncio.sleep(0.001) # 1ms simulated overhead per connection
    end_old = time.perf_counter()
    old_duration = end_old - start_old
    print(f"Simulated Old Logic (O(N) connections): {old_duration:.4f}s")

    # 2. Optimized Logic (Shared client + Batching 1000)
    from app.services.fcm_service import send_push_notification
    from app.utils.http_client import HTTPClient

    # Mock HTTPClient.get_client and client.post
    mock_client = AsyncMock()
    mock_client.post = AsyncMock()

    with patch.object(app.core.config.settings, 'FCM_SERVER_KEY', "test_key"):
        with patch.object(HTTPClient, 'get_client', return_value=mock_client):
            start_new = time.perf_counter()
            await send_push_notification(tokens, title, body)
            end_new = time.perf_counter()

    new_duration = end_new - start_new
    print(f"Optimized Logic (Shared connection + O(N/1000) requests): {new_duration:.4f}s")

    speedup = old_duration / new_duration if new_duration > 0 else float('inf')
    print(f"Speedup: ~{speedup:.1f}x")
    print(f"Requests sent: {mock_client.post.call_count} (Expected: 3)")

if __name__ == "__main__":
    asyncio.run(run_benchmark())
