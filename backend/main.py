from __future__ import annotations

import asyncio

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agent import stream


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TickerRequest(BaseModel):
    ticker: str


current_ticker: str | None = None
stream_task: asyncio.Task[None] | None = None


async def _run_stream(ticker: str) -> None:
    await stream([ticker])


@app.post("/ticker")
async def set_ticker(payload: TickerRequest) -> dict[str, str]:
    global current_ticker, stream_task

    ticker = payload.ticker.strip().upper()
    if not ticker:
        raise HTTPException(status_code=400, detail="ticker is required")

    current_ticker = ticker

    if stream_task and not stream_task.done():
        stream_task.cancel()
        try:
            await stream_task
        except asyncio.CancelledError:
            pass

    stream_task = asyncio.create_task(_run_stream(ticker))
    return {"ticker": ticker}


@app.get("/ticker")
async def get_ticker() -> dict[str, str | None]:
    return {"ticker": current_ticker}
