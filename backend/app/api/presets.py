from fastapi import APIRouter

from app.data.assumptions import PRESETS


router = APIRouter(prefix="/presets", tags=["presets"])


@router.get("")
def list_presets() -> dict[str, object]:
    return PRESETS

