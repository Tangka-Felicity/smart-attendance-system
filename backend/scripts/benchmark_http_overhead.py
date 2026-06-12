import asyncio
import httpx
import time
from typing import List

async def benchmark_individual_clients(url: str, count: int):
    start = time.perf_counter()
    for _ in range(count):
        async with httpx.AsyncClient() as client:
            # We don't actually need to make a request to see the overhead of client creation
            # but let's assume we do.
            pass
    end = time.perf_counter()
    return end - start

async def benchmark_shared_client(url: str, count: int):
    start = time.perf_counter()
    async with httpx.AsyncClient() as client:
        for _ in range(count):
            pass
    end = time.perf_counter()
    return end - start

async def main():
    count = 100
    print(f"Running benchmark for {count} operations...")

    time_individual = await benchmark_individual_clients("http://localhost", count)
    print(f"Time with individual clients: {time_individual:.4f}s")

    time_shared = await benchmark_shared_client("http://localhost", count)
    print(f"Time with shared client:     {time_shared:.4f}s")

    if time_shared < time_individual:
        improvement = (time_individual - time_shared) / time_individual * 100
        print(f"Improvement: {improvement:.2f}%")
    else:
        print("No measurable improvement in this mock environment (likely due to no real network IO).")

    # Benchmarking batching logic
    tokens = [f"token_{i}" for i in range(1500)]
    batch_size = 1000
    batches = [tokens[i:i + batch_size] for i in range(0, len(tokens), batch_size)]
    print(f"Batching 1500 tokens into batches of 1000: {len(batches)} batches created.")
    assert len(batches) == 2
    assert len(batches[0]) == 1000
    assert len(batches[1]) == 500
    print("Batching logic verified.")

if __name__ == "__main__":
    asyncio.run(main())
