"""
Face Service — Development Stub
================================
Real face recognition will be added once dlib/deepface is installed.
In dev mode this returns a successful match for testing other features.
"""
from dataclasses import dataclass
from typing import Optional


@dataclass
class FaceIdentifyResult:
    matched:    bool
    person_id:  Optional[str]
    confidence: float
    error:      Optional[str] = None


class LocalFaceService:

    @staticmethod
    def register_face(image_b64: str) -> tuple[Optional[list], Optional[str]]:
        """
        DEV STUB — returns a fake embedding for testing.
        Replace with real implementation once face_recognition is installed.
        """
        # Return 128 zeros as a placeholder embedding
        fake_embedding = [0.0] * 128
        return fake_embedding, None

    @staticmethod
    def identify_face(
        submitted_image_b64: str,
        enrolled_students: list[dict],
    ) -> FaceIdentifyResult:
        """
        DEV STUB — always returns first enrolled student as a match.
        Replace with real implementation once face_recognition is installed.
        """
        if not enrolled_students:
            return FaceIdentifyResult(
                matched=False, person_id=None, confidence=0.0,
                error="No students enrolled in this course."
            )

        # In dev mode return the first student with a registered face
        for student in enrolled_students:
            if student.get("face_embedding"):
                return FaceIdentifyResult(
                    matched=True,
                    person_id=student["student_id"],
                    confidence=0.99,
                )

        return FaceIdentifyResult(
            matched=False, person_id=None, confidence=0.0,
            error="No face profiles registered yet."
        )


# Keep same name so nothing else needs to change
AzureFaceService = LocalFaceService