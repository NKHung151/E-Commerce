#!/usr/bin/env python3
"""Train the LSTM next-item model on data/user_behavior.csv (BEHAVIOR_CSV_PATH)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import settings  # noqa: E402

MIN_EVENTS = 100  # below this the model cannot learn anything meaningful

if __name__ == "__main__":
    csv_path = Path(settings.BEHAVIOR_CSV_PATH)
    if not csv_path.exists():
        print(f"No behaviour log at {csv_path} — nothing to train on")
        sys.exit(0)

    events = sum(1 for line in csv_path.open(encoding="utf-8") if line.strip()) - 1  # minus header
    if events < MIN_EVENTS:
        print(f"Only {events} behaviour events (need {MIN_EVENTS}+) — skipping training")
        sys.exit(0)

    from models.train_lstm import train  # imported late: pulls in torch
    print(f"Training on {events} behaviour events...")
    train(epochs=50, batch_size=32, lr=1e-3)
