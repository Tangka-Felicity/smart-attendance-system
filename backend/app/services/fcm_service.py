from app.core.config import settings
from app.utils.http_client import HTTPClient

async def send_push_notification(
    fcm_tokens: list[str],
    title: str,
    body: str,
    data: dict = {}
):
    """
    Sends push notifications via FCM Legacy HTTP API.
    Optimized: Uses a shared HTTP client and batches tokens (max 1000 per request).
    """
    if not settings.FCM_SERVER_KEY or not fcm_tokens:
        return

    # Use centralized HTTP client to avoid O(N) handshake overhead
    client = HTTPClient.get_client()

    # FCM Legacy supports up to 1000 tokens per request via 'registration_ids'
    # Reducing O(N) requests to O(N/1000)
    for i in range(0, len(fcm_tokens), 1000):
        batch = fcm_tokens[i : i + 1000]
        try:
            await client.post(
                "https://fcm.googleapis.com/fcm/send",
                headers={
                    "Authorization": f"key={settings.FCM_SERVER_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "registration_ids": batch,
                    "notification": {"title": title, "body": body},
                    "data": data
                },
                timeout=10.0
            )
        except Exception as e:
            # Non-blocking error log to preserve performance
            print(f"Error sending FCM batch: {e}")
