from app.core.config import settings
from app.utils.http_client import HTTPClient

async def send_push_notification(
    fcm_tokens: list[str],
    title: str,
    body: str,
    data: dict = {}
):
    if not settings.FCM_SERVER_KEY or not fcm_tokens:
        return

    client = await HTTPClient.get_client()

    # Optimization: Batch FCM tokens into groups of 1000 and use single request
    # This reduces overhead from O(N) connections to O(N/1000) requests
    batch_size = 1000
    for i in range(0, len(fcm_tokens), batch_size):
        batch = fcm_tokens[i : i + batch_size]
        try:
            # Using the Legacy FCM API which supports multiple registration_ids
            # This is significantly faster for multi-recipient notifications
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
                }
            )
        except Exception as e:
            print(f"Error sending push: {e}")
