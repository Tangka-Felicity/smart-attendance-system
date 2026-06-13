from app.core.config import settings
from app.utils.http_client import HTTPClient

async def send_push_notification(
    fcm_tokens: list[str],
    title: str,
    body: str,
    data: dict = {}
):
    """
    Sends push notifications using the FCM Legacy HTTP protocol.
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

    # FCM Legacy HTTP protocol allows up to 1000 tokens in 'registration_ids'
    # This reduces complexity from O(N) requests to O(N/1000) requests.
    for i in range(0, len(fcm_tokens), 1000):
        batch = fcm_tokens[i:i + 1000]
        payload = {
            "registration_ids": batch,
            "notification": {"title": title, "body": body},
            "data": data
        }
        try:
            await client.post(url, headers=headers, json=payload, timeout=10.0)
        except Exception as e:
            print(f"Error sending push batch: {e}")
