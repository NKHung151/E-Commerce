"""Train the LSTM next-item recommender on the behaviour log.

Data preparation
- Events are ordered per user by time; consecutive events on the same product
  (view -> click -> add_to_cart -> purchase) are collapsed into one step. Otherwise
  more than half of the targets are "the item you are looking at", which the model
  learns to repeat while inference deliberately skips already-seen items.
- Each (last <= LSTM_SEQUENCE_LENGTH items -> next item) window is one sample.
- Validation = the last transition of every user (predict the future from the past),
  not a random split, which leaked future items into training.

The checkpoint keeps the epoch with the best validation HitRate@10.
"""
import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset

sys.path.append(str(Path(__file__).parent.parent))

from config import settings  # noqa: E402
from models.lstm_model import LSTMRecommender  # noqa: E402

HIT_K = 10


def load_sequences(csv_path: Path) -> list:
    """Per-user product sequences, oldest first, with consecutive repeats collapsed."""
    df = pd.read_csv(csv_path).dropna(subset=["product_id"])
    df["product_id"] = df["product_id"].astype(int)
    df = df.sort_values(["user_id", "timestamp"], kind="stable")
    sequences = []
    for _, items in df.groupby("user_id")["product_id"]:
        seq = [p for i, p in enumerate(items.tolist()) if i == 0 or p != items.iloc[i - 1]]
        if len(seq) >= 2:
            sequences.append(seq)
    return sequences


def make_windows(sequences: list, product_to_idx: dict, seq_len: int):
    """Split every sequence into training windows; the last transition goes to validation."""
    train, val = [], []
    for seq in sequences:
        idx = [product_to_idx[p] for p in seq]
        for i in range(1, len(idx)):
            window = idx[max(0, i - seq_len):i]
            sample = ([0] * (seq_len - len(window)) + window, idx[i] - 1)  # 0 = padding
            # Users with only one transition stay in training (nothing to hold out).
            (val if i == len(idx) - 1 and len(idx) > 2 else train).append(sample)
    to_tensors = lambda rows: (torch.tensor([r[0] for r in rows]), torch.tensor([r[1] for r in rows]))
    return to_tensors(train), to_tensors(val)


def evaluate(model, loader, criterion):
    model.eval()
    loss, hits, total = 0.0, 0, 0
    with torch.no_grad():
        for x, y in loader:
            logits = model(x)
            loss += criterion(logits, y).item() * len(y)
            top = logits.topk(min(HIT_K, logits.shape[1]), dim=1).indices
            hits += (top == y.unsqueeze(1)).any(dim=1).sum().item()
            total += len(y)
    return loss / max(total, 1), hits / max(total, 1)


def train(epochs=50, batch_size=64, lr=1e-3, weight_decay=1e-5, patience=5):
    data_path = Path(settings.BEHAVIOR_CSV_PATH)
    if not data_path.exists():
        raise FileNotFoundError(f"Behavior data file not found at {data_path}")

    sequences = load_sequences(data_path)
    products = sorted({p for seq in sequences for p in seq})
    product_to_idx = {int(p): i + 1 for i, p in enumerate(products)}  # plain ints: portable checkpoint
    (x_train, y_train), (x_val, y_val) = make_windows(sequences, product_to_idx, settings.LSTM_SEQUENCE_LENGTH)
    print(f"{len(sequences)} users, {len(products)} products, "
          f"{len(y_train)} training / {len(y_val)} validation transitions")

    train_loader = DataLoader(TensorDataset(x_train, y_train), batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(TensorDataset(x_val, y_val), batch_size=256)

    model = LSTMRecommender(num_products=len(products))
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=lr, weight_decay=weight_decay)
    best_hit, best_state, stale = -1.0, None, 0

    for epoch in range(1, epochs + 1):
        model.train()
        running = 0.0
        for x, y in train_loader:
            optimizer.zero_grad()
            loss = criterion(model(x), y)
            loss.backward()
            optimizer.step()
            running += loss.item() * len(y)
        val_loss, val_hit = evaluate(model, val_loader, criterion)
        print(f"Epoch {epoch:2d} | train loss {running / len(y_train):.3f} | "
              f"val loss {val_loss:.3f} | val HitRate@{HIT_K} {val_hit:.1%}")

        if val_hit > best_hit:
            best_hit, stale = val_hit, 0
            best_state = {k: v.detach().clone() for k, v in model.state_dict().items()}
        else:
            stale += 1
            if stale >= patience:
                print(f"Early stopping (no improvement for {patience} epochs)")
                break

    os.makedirs(Path(settings.LSTM_CHECKPOINT_PATH).parent, exist_ok=True)
    torch.save({
        "num_products": len(products),
        "product2idx": product_to_idx,
        "model_state": best_state,
        "val_hit_rate": best_hit,
    }, settings.LSTM_CHECKPOINT_PATH)
    print(f"Saved best model (val HitRate@{HIT_K} {best_hit:.1%}) to {settings.LSTM_CHECKPOINT_PATH}")
    return best_hit


if __name__ == "__main__":
    np.random.seed(0)
    torch.manual_seed(0)
    train()
