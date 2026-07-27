from fastapi import APIRouter


# This router exists only to answer GET /ping with a fast keep-alive response.
router = APIRouter(prefix="/ping", tags=["ping"])


# This route is served directly at /ping, without a trailing-slash redirect.
@router.get("")
async def ping() -> dict[str, str]:
    # Keep the response small and fast so it does not trigger any heavy backend logic.
    return {"status": "ok"}
