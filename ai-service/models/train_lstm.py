import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
import os
import sys

# Add parent directory to path to import models and config
sys.path.append(str(Path(__file__).parent.parent))

from models.lstm_model import LSTMRecommender
from config import settings

class EarlyStopping:
    def __init__(self, patience=5, min_delta=0):
        self.patience = patience
        self.min_delta = min_delta
        self.counter = 0
        self.best_loss = None
        self.early_stop = False

    def __call__(self, val_loss):
        if self.best_loss is None:
            self.best_loss = val_loss
        elif val_loss > self.best_loss - self.min_delta:
            self.counter += 1
            if self.counter >= self.patience:
                self.early_stop = True
        else:
            self.best_loss = val_loss
            self.counter = 0

class UserBehaviorDataset(Dataset):
    def __init__(self, sequences, targets):
        self.sequences = torch.LongTensor(sequences)
        self.targets = torch.LongTensor(targets)

    def __len__(self):
        return len(self.sequences)

    def __getitem__(self, idx):
        return self.sequences[idx], self.targets[idx]

def prepare_data(file_path: Path):
    if file_path.suffix == '.xlsx':
        df = pd.read_excel(file_path)
    else:
        df = pd.read_csv(file_path)
    
    df = df[df['product_id'].notna()]
    df['product_id'] = df['product_id'].astype(int)
    
    unique_products = sorted(df['product_id'].unique())
    product_to_idx = {pid: i + 1 for i, pid in enumerate(unique_products)}
    num_products = len(unique_products)
    
    if 'timestamp' in df.columns:
        df = df.sort_values(['user_id', 'timestamp'])
    
    user_sequences = df.groupby('user_id')['product_id'].apply(list)
    
    X, y = [], []
    seq_len = settings.LSTM_SEQUENCE_LENGTH
    
    for seq in user_sequences:
        if len(seq) < 2: continue
        idx_seq = [product_to_idx[pid] for pid in seq]
        for i in range(1, len(idx_seq)):
            start = max(0, i - seq_len)
            window = idx_seq[start:i]
            if len(window) < seq_len:
                window = [0] * (seq_len - len(window)) + window
            X.append(window)
            y.append(idx_seq[i] - 1)
            
    X, y = np.array(X), np.array(y)
    indices = np.arange(len(X))
    np.random.shuffle(indices)
    
    split = int(0.8 * len(X))
    train_idx, val_idx = indices[:split], indices[split:]
    
    return (X[train_idx], y[train_idx]), (X[val_idx], y[val_idx]), num_products, product_to_idx

def calculate_accuracy(outputs, targets):
    _, predicted = torch.max(outputs, 1)
    correct = (predicted == targets).sum().item()
    return correct / targets.size(0)

def train(epochs=50, batch_size=32, lr=1e-3, weight_decay=1e-5):
    print("🚀 Starting LSTM Recommender Training...")
    
    # Locate data file
    data_path = Path(settings.BEHAVIOR_EXCEL_PATH)
    if not data_path.exists():
        data_path = Path(settings.BEHAVIOR_CSV_PATH)
        
    if not data_path.exists():
        raise FileNotFoundError(f"Behavior data file not found at {settings.BEHAVIOR_CSV_PATH} or {settings.BEHAVIOR_EXCEL_PATH}")

    (X_train, y_train), (X_val, y_val), num_products, product_to_idx = prepare_data(data_path)
    
    train_loader = DataLoader(UserBehaviorDataset(X_train, y_train), batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(UserBehaviorDataset(X_val, y_val), batch_size=batch_size)
    
    model = LSTMRecommender(num_products=num_products)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=lr, weight_decay=weight_decay)
    early_stopping = EarlyStopping(patience=5)
    
    history = {'train_loss': [], 'val_loss': [], 'val_acc': []}
    
    for epoch in range(epochs):
        model.train()
        train_loss = 0
        for batch_X, batch_y in train_loader:
            optimizer.zero_grad()
            outputs = model(batch_X)
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()
            
        model.eval()
        val_loss, val_acc = 0, 0
        with torch.no_grad():
            for batch_X, batch_y in val_loader:
                outputs = model(batch_X)
                val_loss += criterion(outputs, batch_y).item()
                val_acc += calculate_accuracy(outputs, batch_y)
                
        avg_train_loss = train_loss / len(train_loader)
        avg_val_loss = val_loss / len(val_loader)
        avg_val_acc = val_acc / len(val_loader)
        
        history['train_loss'].append(avg_train_loss)
        history['val_loss'].append(avg_val_loss)
        history['val_acc'].append(avg_val_acc)
        
        print(f"Epoch [{epoch+1}/{epochs}] - Train Loss: {avg_train_loss:.4f} | Val Loss: {avg_val_loss:.4f} | Val Acc: {avg_val_acc:.2%}")
        
        early_stopping(avg_val_loss)
        if early_stopping.early_stop:
            print(f"Early stopping at epoch {epoch+1}")
            break
            
    # Save checkpoint
    os.makedirs(Path(settings.LSTM_CHECKPOINT_PATH).parent, exist_ok=True)
    checkpoint = {
        "num_products": num_products,
        "product2idx": product_to_idx,
        "model_state": model.state_dict()
    }
    torch.save(checkpoint, settings.LSTM_CHECKPOINT_PATH)
    print(f"💾 LSTM model checkpoint saved to {settings.LSTM_CHECKPOINT_PATH}")
    
    # Save training plots
    os.makedirs("data/plots", exist_ok=True)
    plt.figure(figsize=(10, 5))
    
    plt.subplot(1, 2, 1)
    plt.plot(history['train_loss'], label='Train Loss')
    plt.plot(history['val_loss'], label='Val Loss')
    plt.title('Loss Curve')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.legend()
    plt.grid(True)
    
    plt.subplot(1, 2, 2)
    plt.plot(history['val_acc'], color='green', label='Val Accuracy')
    plt.title('Validation Accuracy')
    plt.xlabel('Epoch')
    plt.ylabel('Accuracy')
    plt.legend()
    plt.grid(True)
    
    plt.tight_layout()
    plt.savefig("data/plots/lstm_training.png")
    plt.close()
    print("📈 Training plots saved to data/plots/lstm_training.png")

if __name__ == "__main__":
    train(epochs=20)
