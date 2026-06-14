from app.core.config import settings
from app.utils.http_client import HTTPClient

async def send_push_notification(
    fcm_tokens: list[str],
    title: str,
    body: str,
    data: dict = {}
):
    """
    Sends push notifications to a list of FCM tokens using the Legacy HTTP protocol.
    Optimized to use a shared HTTP client and batch tokens in groups of 1000.
    """
    if not settings.FCM_SERVER_KEY or not fcm_tokens:
        return

    client = await HTTPClient.get_client()
    url = "https://fcm.googleapis.com/fcm/send"
    headers = {
        "Authorization": f"key={settings.FCM_SERVER_KEY}",
        "Content-Type": "application/json"
    }

    # FCM Legacy HTTP protocol supports up to 1000 registration_ids per request
    chunk_size = 1000
    for i in range(0, len(fcm_tokens), chunk_size):
        chunk = fcm_tokens[i : i + chunk_size]
        payload = {
            "registration_ids": chunk,
            "notification": {"title": title, "body": body},
            "data": data
        }
        try:
            # Reusing the shared client to avoid O(N) TCP/TLS handshakes
            await client.post(url, headers=headers, json=payload, timeout=10.0)
        except Exception as e:
            print(f"Error sending push batch: {e}")
