from __future__ import annotations

# asyncio lets us run background work without blocking the API.
import asyncio

# FastAPI is the web framework that powers this backend.
from fastapi import FastAPI, HTTPException
# CORSMiddleware allows the frontend to call this backend from another origin.
from fastapi.middleware.cors import CORSMiddleware
# BaseModel gives us simple request-body validation.
from pydantic import BaseModel

# stream is the function that starts the market-data streaming work.
from agent import stream
# Import the tiny ping router so we can serve /ping directly.
from ping.ping import router as ping_router


# Create the FastAPI app object.
# Uvicorn loads it with the name `main:app`.
app = FastAPI()

# Add CORS settings so the frontend can talk to this backend from another origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the ping router so `/ping` responds directly with no redirect.
app.include_router(ping_router)


# This class describes the JSON body the frontend sends to `/ticker`.
class TickerRequest(BaseModel):
    # The ticker symbol sent from the frontend, like "AAPL" or "TSLA".
    ticker: str


# Store the most recent ticker in memory so it can be returned later.
current_ticker: str | None = None
# Store the running stream task so we can cancel it before starting a new one.
stream_task: asyncio.Task[None] | None = None


# This helper function runs the stream logic for one ticker.
async def _run_stream(ticker: str) -> None:
    # Delegate the actual streaming work to the agent module.
    await stream([ticker])


# POST /ticker updates the active ticker and starts streaming data for it.
@app.post("/ticker")
async def set_ticker(payload: TickerRequest) -> dict[str, str]:
    # Tell Python that we want to use the module-level variables above.
    global current_ticker, stream_task

    # Remove extra spaces and force uppercase so input like " aapl " becomes "AAPL".
    ticker = payload.ticker.strip().upper()

    # If the user sent an empty value, return a 400 error.
    if not ticker:
        raise HTTPException(status_code=400, detail="ticker is required")

    # Remember the newest ticker in memory.
    current_ticker = ticker

    # If a previous streaming task is still running, stop it first.
    if stream_task and not stream_task.done():
        # Ask the running task to stop.
        stream_task.cancel()
        try:
            # Wait for the task to finish shutting down cleanly.
            await stream_task
        except asyncio.CancelledError:
            # We expect cancellation here, so we ignore that exception.
            pass

    # Start a new background task for the new ticker.
    stream_task = asyncio.create_task(_run_stream(ticker))

    # Return the ticker we accepted so the frontend can confirm it.
    return {"ticker": ticker}


# GET /ticker returns the latest ticker that was saved in memory.
@app.get("/ticker")
async def get_ticker() -> dict[str, str | None]:
    # Return the most recently selected ticker, if there is one.
    return {"ticker": current_ticker}
