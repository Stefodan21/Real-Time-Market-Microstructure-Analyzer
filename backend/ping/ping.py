from fastapi import FastAPI


# This tiny FastAPI app only exists to answer GET / with a fast keep-alive response.
ping_app = FastAPI()


# When mounted at /ping by main.py, this route becomes GET /ping.
@ping_app.get("/")
async def ping() -> dict[str, str]:
    # Keep the response small and fast so it does not trigger any heavy backend logic.
    return {"status": "ok"}
