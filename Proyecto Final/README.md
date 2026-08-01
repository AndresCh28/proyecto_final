# SIGECOM

Sistema Integral de Gestion de Comision desarrollado con Python, Kivy y Supabase.

## Ejecucion local

1. Crear y activar entorno virtual.
2. Instalar dependencias con `pip install -r requirements.txt`.
3. Configurar `.env` con:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY` o `SUPABASE_KEY`
4. Ejecutar `python main.py`.

## Estructura base

- `screens/`: pantallas Kivy
- `services/`: acceso a Supabase y autenticacion
- `models/`: entidades base
- `utils/`: validaciones y sesion local
- `kv/`: interfaz visual separada por pantalla
- `database/`: scripts SQL de Supabase
