import asyncio
import time
import httpx
from fastapi import FastAPI, Response
import uvicorn
import threading

# Mock FCM Server
app = FastAPI()

@app.post("/fcm/send")
async def mock_fcm_send():
    # Simulate a small processing delay
    await asyncio.sleep(0.005)
    return {"message_id": 12345}

def run_mock_server():
    uvicorn.run(app, host="127.0.0.1", port=8099, log_level="error")

# Old Implementation
async def send_push_notification_old(fcm_tokens, title, body, server_key, data={}):
    for token in fcm_tokens:
        async with httpx.AsyncClient() as client:
            try:
                await client.post(
                    "http://127.0.0.1:8099/fcm/send",
                    headers={
                        "Authorization": f"key={server_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "to": token,
                        "notification": {"title": title, "body": body},
                        "data": data
                    }
                )
            except Exception as e:
                print(f"Error: {e}")

# New Implementation (Proposed)
async def send_push_notification_new(fcm_tokens, title, body, server_key, data={}):
    # Unique tokens to avoid redundant sends
    unique_tokens = list(set(fcm_tokens))
    if not unique_tokens:
        return

    async with httpx.AsyncClient() as client:
        # Batching (FCM Legacy limit is 1000)
        for i in range(0, len(unique_tokens), 1000):
            batch = unique_tokens[i:i+1000]
            payload = {
                "registration_ids": batch,
                "notification": {"title": title, "body": body},
                "data": data
            }
            try:
                await client.post(
                    "http://127.0.0.1:8099/fcm/send",
                    headers={
                        "Authorization": f"key={server_key}",
                        "Content-Type": "application/json"
                    },
                    json=payload
                )
            except Exception as e:
                print(f"Error: {e}")

async def main():
    # Start mock server in a thread
    server_thread = threading.Thread(target=run_mock_server, daemon=True)
    server_thread.start()

    # Wait for server to start
    await asyncio.sleep(2)

    tokens = [f"token_{i}" for i in range(50)]
    title = "Test Notification"
    body = "This is a benchmark test"
    server_key = "test_key"

    print(f"--- Benchmarking with {len(tokens)} tokens ---")

    # Warm up
    await send_push_notification_old(tokens[:1], title, body, server_key)

    start_old = time.perf_counter()
    await send_push_notification_old(tokens, title, body, server_key)
    end_old = time.perf_counter()
    duration_old = end_old - start_old
    print(f"Old Implementation (Sequential): {duration_old:.4f}s")

    start_new = time.perf_counter()
    await send_push_notification_new(tokens, title, body, server_key)
    end_new = time.perf_counter()
    duration_new = end_new - start_new
    print(f"New Implementation (Batched):    {duration_new:.4f}s")

    improvement = (duration_old - duration_new) / duration_old * 100
    print(f"Performance Improvement: {improvement:.2f}%")

    if duration_new < duration_old:
        print("SUCCESS: Optimized version is faster!")
    else:
        print("FAILURE: Optimized version is slower or equal.")

if __name__ == "__main__":
    asyncio.run(main())
