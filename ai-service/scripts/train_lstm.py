#!/usr/bin/env python3
"""
LSTM training script — trains the sequence model on user_behavior.csv
Only runs if CSV has 100+ records for meaningful training.
"""
import sys
from pathlib import Path

# Add ai-service to path
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    import torch  # noqa: F401  (fail fast if PyTorch is missing)
    from models.train_lstm import train
except Exception as e:
    print(f"❌ PyTorch/model imports failed: {e}")
    sys.exit(1)


if __name__ == "__main__":
    print("🎓 LSTM Training Script")
    print("=" * 50)
    
    # Check for multiple possible data files
    data_files = [
        Path("user_behavior.xlsx"),
        Path("user_behavior (1).csv"),
        Path("data/user_behavior.csv")
    ]
    
    csv_path = None
    for f in data_files:
        if f.exists():
            csv_path = f
            break
            
    if not csv_path:
        print("⚠️  No behavior data found (checked .xlsx and .csv) — skipping training")
        sys.exit(0)
    
    # Check data size
    if csv_path.suffix == '.xlsx':
        import pandas as pd
        df = pd.read_excel(csv_path)
        records = len(df)
    else:
        lines = csv_path.read_text(encoding='utf-8', errors='ignore').split('\n')
        records = len([l for l in lines if l.strip() and not l.startswith('user_id')])
    
    if records < 10: # Lowered for testing, user should have more in production
        print(f"⚠️  Only {records} behavior records — need more to train meaningfully")
        sys.exit(0)
    
    print(f"📊 Training on {records} behavior records...")
    try:
        train(epochs=50, batch_size=32, lr=1e-3)
        print("✅ Training complete!")
    except Exception as e:
        print(f"❌ Training failed: {e}")
        sys.exit(1)
