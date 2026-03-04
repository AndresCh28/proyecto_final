from supabase import create_client, Client

# 🔗 Pega aquí tus datos reales
SUPABASE_URL = "https://kkzloblqzwbmjtkpzqzj.supabase.co"
SUPABASE_KEY = "sb_publishable_UvTdwEK9Rl5sR2_GCyGJpw_h6124EBr"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def login_usuario(correo, password):
    try:
        response = supabase.auth.sign_in_with_password({
            "email": correo,
            "password": password
        })
        return response
    except Exception as e:
        return None