from pathlib import Path
import os

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"

load_dotenv(ENV_PATH)


class AppConfig:
    def __init__(self):
        self.base_dir = BASE_DIR
        self.app_name = "SIGECOM"
        self.supabase_url = os.getenv("SUPABASE_URL", "").strip()
        self.supabase_key = (
            os.getenv("SUPABASE_ANON_KEY")
            or os.getenv("SUPABASE_KEY")
            or ""
        ).strip()
        self.session_store_path = self.base_dir / "assets" / "session_store.json"
        self.smtp_host = os.getenv("SMTP_HOST", "").strip()
        self.smtp_port = int(os.getenv("SMTP_PORT", "587").strip() or "587")
        self.smtp_user = os.getenv("SMTP_USER", "").strip()
        self.smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
        self.smtp_from_email = os.getenv("SMTP_FROM_EMAIL", "").strip()
        self.smtp_use_tls = os.getenv("SMTP_USE_TLS", "true").strip().lower() in {"1", "true", "yes"}

    @property
    def supabase_is_configured(self):
        return bool(self.supabase_url and self.supabase_key)

    @property
    def smtp_is_configured(self):
        return bool(
            self.smtp_host
            and self.smtp_port
            and self.smtp_user
            and self.smtp_password
            and self.smtp_from_email
        )
