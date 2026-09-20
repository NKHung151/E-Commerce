import torch
import torch.nn as nn

class LSTMRecommender(nn.Module):
    def __init__(self, num_products: int, embedding_dim: int = 64, hidden_dim: int = 128, num_layers: int = 2, dropout: float = 0.3):
        super().__init__()
        self.embedding = nn.Embedding(num_products + 1, embedding_dim, padding_idx=0)
        self.lstm = nn.LSTM(input_size=embedding_dim, hidden_size=hidden_dim, num_layers=num_layers, batch_first=True, dropout=dropout if num_layers > 1 else 0)
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(hidden_dim, num_products)

    def forward(self, x):
        emb = self.embedding(x)
        out, _ = self.lstm(emb)
        out = self.dropout(out[:, -1, :])
        return self.fc(out)
