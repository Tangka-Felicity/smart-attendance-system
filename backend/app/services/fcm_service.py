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

    for token in fcm_tokens:
        async with httpx.AsyncClient() as client:
            try:
                await client.post(
                    "https://fcm.googleapis.com/fcm/send",
                    headers={
                        "Authorization": f"key={settings.FCM_SERVER_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "to": token,
                        "notification": {"title": title, "body": body},
                        "data": data
                    }
                )
            except Exception as e:
                print(f"Error sending push: {e}")
