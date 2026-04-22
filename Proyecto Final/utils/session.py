from pathlib import Path

from kivy.storage.jsonstore import JsonStore


class SessionStore:
    def __init__(self, storage_path: Path):
        self.storage_path = storage_path
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        self.store = JsonStore(str(self.storage_path))

    def save(self, session_data: dict):
        self.store.put("session", **session_data)

    def load(self) -> dict | None:
        if self.store.exists("session"):
            return self.store.get("session")
        return None

    def clear(self):
        if self.store.exists("session"):
            self.store.delete("session")
