import httpx
from app.core.config import settings

async def send_push_notification(
    fcm_tokens: list[str],
    title: str,
    body: str,
    data: dict = {}
):
    if not settings.FCM_SERVER_KEY:
        return

    # Optimization: Use a single client and batch tokens to reduce connections and requests.
    # This reduces complexity from O(N) connections/requests to O(N/1000) requests and 1 connection.
    async with httpx.AsyncClient() as client:
        # FCM Legacy HTTP API supports up to 1000 registration IDs per request.
        for i in range(0, len(fcm_tokens), 1000):
            batch = fcm_tokens[i : i + 1000]
            try:
                await client.post(
                    "https://fcm.googleapis.com/fcm/send",
                    headers={
                        "Authorization": f"key={settings.FCM_SERVER_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "registration_ids": batch,
                        "notification": {"title": title, "body": body},
                        "data": data,
                    },
                )
            except Exception as e:
                print(f"Error sending push batch: {e}")
