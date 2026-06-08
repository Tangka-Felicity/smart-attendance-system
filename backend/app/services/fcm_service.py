import httpx
from app.core.config import settings

async def send_push_notification(
    fcm_tokens: list[str],
    title: str,
    body: str,
    data: dict = {}
):
    """
    Sends push notifications to a list of FCM tokens using batching.
    Optimized to use a single client and multicast messages (registration_ids).
    """
    if not settings.FCM_SERVER_KEY or not fcm_tokens:
        return

    # Unique tokens to avoid redundant sends
    unique_tokens = list(set(fcm_tokens))

    async with httpx.AsyncClient(timeout=10.0) as client:
        # FCM Legacy HTTP API allows up to 1000 registration_ids per request
        for i in range(0, len(unique_tokens), 1000):
            batch = unique_tokens[i:i+1000]
            payload = {
                "registration_ids": batch,
                "notification": {
                    "title": title,
                    "body": body,
                    "sound": "default"
                },
                "data": data
            }
            try:
                await client.post(
                    "https://fcm.googleapis.com/fcm/send",
                    headers={
                        "Authorization": f"key={settings.FCM_SERVER_KEY}",
                        "Content-Type": "application/json"
                    },
                    json=payload
                )
            except Exception as e:
                # Log error but don't crash the background task/request
                print(f"Error sending FCM batch: {e}")
