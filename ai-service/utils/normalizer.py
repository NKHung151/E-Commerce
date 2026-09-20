"""Score normalization utilities for hybrid recommendation."""


def normalize_scores(scores: dict) -> dict:
    """Normalize scores to 0-1 range."""
    if not scores:
        return {}
    max_val = max(scores.values()) or 1.0
    return {k: v / max_val for k, v in scores.items()}


def weighted_average(score_dicts: list, weights: list) -> dict:
    """Compute weighted average of multiple score dictionaries."""
    if not score_dicts or not weights:
        return {}
    result = {}
    for scores, weight in zip(score_dicts, weights):
        for pid, score in scores.items():
            result[pid] = result.get(pid, 0) + score * weight
    return result
