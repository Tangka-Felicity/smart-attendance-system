from app.core.config import settings
from app.utils.http_client import HTTPClient

async def send_push_notification(
    fcm_tokens: list[str],
    title: str,
    body: str,
    data: dict = {}
):
    """
    Sends push notifications via FCM Legacy API.
    Optimized to use a shared HTTP client and batch tokens to reduce overhead.
    """
    if not settings.FCM_SERVER_KEY or not fcm_tokens:
        return

    client = await HTTPClient.get_client()

    # FCM Legacy API supports up to 1000 registration_ids per request
    # Batching reduces O(N) connections/requests to O(N/1000)
    batch_size = 1000
    for i in range(0, len(fcm_tokens), batch_size):
        batch = fcm_tokens[i:i + batch_size]
        try:
            # Using registration_ids for batching in Legacy HTTP API
            payload = {
                "registration_ids": batch,
                "notification": {"title": title, "body": body},
                "data": data
            }
            await client.post(
                "https://fcm.googleapis.com/fcm/send",
                headers={
                    "Authorization": f"key={settings.FCM_SERVER_KEY}",
                    "Content-Type": "application/json"
                },
                json=payload
            )
        except Exception as e:
            # Log error but continue with other batches if any
            print(f"Error sending push batch: {e}")
