import asyncio
import time
import httpx
from typing import List

# Mock FCM URL
FCM_URL = "http://localhost:8080/fcm/send"

async def current_implementation(tokens: List[str], title: str, body: str):
    """Simulates the current send_push_notification logic."""
    for token in tokens:
        async with httpx.AsyncClient() as client:
            try:
                # We use a dummy URL that will fail quickly or we mock it
                await client.post(
                    FCM_URL,
                    headers={"Authorization": "key=dummy", "Content-Type": "application/json"},
                    json={"to": token, "notification": {"title": title, "body": body}}
                )
            except Exception:
                pass

async def optimized_implementation(tokens: List[str], title: str, body: str, shared_client: httpx.AsyncClient):
    """Simulates the optimized logic: shared client + batching."""
    # FCM Legacy batching supports up to 1000 tokens in registration_ids
    for i in range(0, len(tokens), 1000):
        batch = tokens[i : i + 1000]
        try:
            await shared_client.post(
                FCM_URL,
                headers={"Authorization": "key=dummy", "Content-Type": "application/json"},
                json={"registration_ids": batch, "notification": {"title": title, "body": body}}
            )
        except Exception:
            pass

async def main():
    num_tokens = 100
    tokens = [f"token_{i}" for i in range(num_tokens)]
    title = "Test"
    body = "Test Body"

    print(f"Benchmarking with {num_tokens} tokens...")

    # 1. Current
    start = time.perf_counter()
    await current_implementation(tokens, title, body)
    end = time.perf_counter()
    current_time = end - start
    print(f"Current Implementation: {current_time:.4f}s")

    # 2. Optimized
    async with httpx.AsyncClient() as shared_client:
        start = time.perf_counter()
        await optimized_implementation(tokens, title, body, shared_client)
        end = time.perf_counter()
        optimized_time = end - start

    print(f"Optimized Implementation: {optimized_time:.4f}s")

    if optimized_time > 0:
        improvement = (current_time - optimized_time) / current_time * 100
        print(f"Improvement: {improvement:.2f}%")
        print(f"Speedup: {current_time / optimized_time:.2f}x")

if __name__ == "__main__":
    # Start a dummy server in background to avoid connection errors if possible
    # For simplicity in this environment, we'll just let it fail/timeout
    # but that might skew results. Let's use a mock.

    from unittest.mock import patch

    # Mocking the actual POST call to avoid network wait but keep client overhead
    with patch("httpx.AsyncClient.post") as mock_post:
        # Simulate a small network delay
        mock_post.return_value = httpx.Response(200, json={"success": 1})

        asyncio.run(main())
