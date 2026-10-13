def normalize(scores: dict) -> dict:
    """Scale scores to 0..1 by the maximum so different sources can be blended."""
    if not scores:
        return {}
    top = max(scores.values()) or 1
    return {k: v / top for k, v in scores.items()}
