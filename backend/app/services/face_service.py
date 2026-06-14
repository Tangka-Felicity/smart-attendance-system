from dataclasses import dataclass
from typing import Optional, List
from app.core.config import settings
from app.utils.http_client import HTTPClient

@dataclass
class FaceIdentifyResult:
    matched:    bool
    person_id:  Optional[str]
    confidence: float
    error:      Optional[str] = None

class FacePlusPlusService:
    """
    Face++ (Megvii) Integration Service
    Uses FaceSets to manage course-level face collections.
    """
    BASE_URL = "https://api-us.faceplusplus.com/facepp/v3"

    @classmethod
    async def _request(cls, endpoint: str, data: dict) -> dict:
        data["api_key"] = settings.FACEPP_API_KEY
        data["api_secret"] = settings.FACEPP_API_SECRET
        client = await HTTPClient.get_client()
        try:
            resp = await client.post(f"{cls.BASE_URL}/{endpoint}", data=data, timeout=20.0)
            return resp.json()
        except Exception as e:
            return {"error_message": str(e)}

    @classmethod
    async def register_face(cls, course_id: str, student_id: str, face_image_b64: str) -> Optional[str]:
        if not settings.FACEPP_API_KEY:
            # Fallback for development if keys are missing
            return f"dev_token_{student_id}"

        # 1. Detect face to get a face_token
        detect_res = await cls._request("detect", {"image_base64": face_image_b64})
        faces = detect_res.get("faces", [])
        if not faces:
            return None
        face_token = faces[0]["face_token"]

        # 2. Add face to FaceSet (Course-specific)
        # Faceset outer_id is the course_id
        add_res = await cls._request("faceset/addface", {"outer_id": course_id, "face_tokens": face_token})

        if "error_message" in add_res and "OUTER_ID_NOT_FOUND" in add_res["error_message"]:
            # Create FaceSet if it doesn't exist
            await cls._request("faceset/create", {"outer_id": course_id})
            await cls._request("faceset/addface", {"outer_id": course_id, "face_tokens": face_token})

        # 3. Set User ID for the token to identify the student later
        await cls._request("face/setuserid", {"face_token": face_token, "user_id": student_id})

        return face_token

    @classmethod
    async def identify_face(cls, course_id: str, face_image_b64: str) -> FaceIdentifyResult:
        if not settings.FACEPP_API_KEY:
            # In dev mode, we can't really identify without keys, but let's not break everything
            return FaceIdentifyResult(matched=True, person_id=None, confidence=100.0)

        search_res = await cls._request("search", {
            "image_base64": face_image_b64,
            "outer_id": course_id
        })

        results = search_res.get("results", [])
        if not results:
            return FaceIdentifyResult(
                matched=False,
                person_id=None,
                confidence=0.0,
                error=search_res.get("error_message", "No match found")
            )

        top_match = results[0]
        confidence = top_match.get("confidence", 0.0)

        if confidence >= settings.FACEPP_API_CONFIDENCE_THRESHOLD:
            return FaceIdentifyResult(
                matched=True,
                person_id=top_match.get("user_id"),
                confidence=confidence
            )

        return FaceIdentifyResult(matched=False, person_id=None, confidence=confidence)

    @classmethod
    async def delete_face_profile(cls, course_id: str, face_token: str):
        if not settings.FACEPP_API_KEY:
            return
        await cls._request("faceset/removeface", {"outer_id": course_id, "face_tokens": face_token})

# Alias for compatibility with existing imports
AzureFaceService = FacePlusPlusService
