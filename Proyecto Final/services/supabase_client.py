from supabase import Client, create_client


class SupabaseClientManager:
    def __init__(self, config):
        self.config = config
        self._client = None

    def get_client(self) -> Client:
        if self._client is None:
            if not self.config.supabase_is_configured:
                raise ValueError(
                    "Faltan SUPABASE_URL y SUPABASE_ANON_KEY/SUPABASE_KEY en el archivo .env."
                )
            self._client = create_client(
                self.config.supabase_url,
                self.config.supabase_key,
            )
        return self._client
