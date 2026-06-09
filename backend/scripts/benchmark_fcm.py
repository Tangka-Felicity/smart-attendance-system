import asyncio
import time
from unittest.mock import AsyncMock, patch
import httpx
import sys
import os

# Simulating network latency
LATENCY = 0.001 # 1ms

class MockResponse:
    def __init__(self):
        self.status_code = 200
    async def json(self):
        return {"success": 1}

async def simulate_post(*args, **kwargs):
    await asyncio.sleep(LATENCY)
    return MockResponse()

async def benchmark_current():
    # This simulates the OLD behavior
    num_tokens = 500
    tokens = [f"token_{i}" for i in range(num_tokens)]

    async def old_send_push_notification(fcm_tokens, title, body, data={}):
        # Mocking settings check
        fcm_server_key = "fake_key"
        if not fcm_server_key:
            return
        for token in fcm_tokens:
            async with httpx.AsyncClient() as client:
                await simulate_post()

    start = time.perf_counter()
    await old_send_push_notification(tokens, "Title", "Body")
    end = time.perf_counter()
    return end - start

async def benchmark_optimized():
    num_tokens = 500
    tokens = [f"token_{i}" for i in range(num_tokens)]

    # We redefine the optimized function here to avoid importing app.core.config
    async def optimized_send_push_notification(fcm_tokens, title, body, data={}):
        fcm_server_key = "fake_key"
        if not fcm_server_key:
            return

        async with httpx.AsyncClient() as client:
            for i in range(0, len(fcm_tokens), 1000):
                batch = fcm_tokens[i : i + 1000]
                try:
                    await simulate_post()
                except Exception as e:
                    print(f"Error sending push batch: {e}")

    start = time.perf_counter()
    await optimized_send_push_notification(tokens, "Title", "Body")
    end = time.perf_counter()
    return end - start

async def main():
    print("Benchmarking with 500 tokens...")

    current_duration = await benchmark_current()
    print(f"Current (simulated old) implementation: {current_duration:.4f} seconds")

    optimized_duration = await benchmark_optimized()
    print(f"Optimized implementation: {optimized_duration:.4f} seconds")

    improvement = (current_duration - optimized_duration) / current_duration * 100
    print(f"Improvement: {improvement:.2f}%")

if __name__ == "__main__":
    asyncio.run(main())
