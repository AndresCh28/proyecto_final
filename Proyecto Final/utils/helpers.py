def safe_text(value, default="Sin informacion"):
    if value is None:
        return default
    cleaned = str(value).strip()
    return cleaned if cleaned else default
