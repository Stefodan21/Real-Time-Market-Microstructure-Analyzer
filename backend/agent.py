from __future__ import annotations

from pathlib import Path
from typing import Iterable

import pandas as pd
import torch.nn as nn
from stable_baselines3 import PPO
from stable_baselines3.common.torch_layers import BaseFeaturesExtractor
import yfinance as yf



FEATURE_COLUMNS = ["open", "high", "low", "close", "volume"]
WS_URL = "wss://streamer.finance.yahoo.com/?version=2"
MODEL_PATH = Path("./model/best_model.zip")


class CustomFeaturesExtractor(BaseFeaturesExtractor):
    def __init__(self, observation_space, features_dim: int = 64):
        super().__init__(observation_space, features_dim)
        n_inputs = observation_space.shape[0]
        self.network = nn.Sequential(
            nn.Flatten(),
            nn.LayerNorm(n_inputs),
            nn.Linear(n_inputs, 64),
            nn.ReLU(),
            nn.Identity(),
            nn.LayerNorm(64),
            nn.Linear(64, 64),
            nn.ReLU(),
        )

    def forward(self, observations):
        return self.network(observations)


def load_model() -> PPO:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")

    return PPO.load(
        MODEL_PATH,
        device="cpu",
        custom_objects={
            "policy_kwargs": {
                "features_extractor_class": CustomFeaturesExtractor,
                "features_extractor_kwargs": {"features_dim": 64},
            },
            "clip_range": lambda _: 0.2,
            "lr_schedule": lambda _: 0.0,
        },
    )


model = load_model()


def message_handler(message: object) -> int | None:
    """
    Handle each incoming market message for the selected symbols and return the agent action.
    """

    if isinstance(message, pd.DataFrame):
        frame = message.copy()
    elif isinstance(message, list):
        frame = pd.DataFrame(message)
    elif isinstance(message, dict):
        frame = pd.json_normalize(message)
    else:
        frame = pd.DataFrame([{"raw_message": message}])

    if not all(column in frame.columns for column in FEATURE_COLUMNS):
        return None

    features = frame[FEATURE_COLUMNS].apply(pd.to_numeric, errors="coerce").dropna()
    if features.empty:
        return None

    state = features.iloc[-1].to_numpy(dtype="float32")
    action, _ = model.predict(state, deterministic=True)
    action = int(action)

    print({"last_state": features.iloc[-1].to_dict(), "action": action})
    return action


async def stream(symbols: Iterable[str], url: str | None = None) -> None:
    if yf is None:
        raise RuntimeError("yfinance is not installed. Install project dependencies before running the agent.")

    watched_symbols = [symbol.strip() for symbol in symbols if symbol.strip()]
    if not watched_symbols:
        raise ValueError("No symbols provided.")

    async with yf.AsyncWebSocket(url=url or WS_URL) as ws:
        await ws.subscribe(watched_symbols)
        await ws.listen(message_handler=message_handler)