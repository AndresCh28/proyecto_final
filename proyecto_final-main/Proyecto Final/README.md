# SIGECOM

Sistema Integral de Gestión de Comisión. La aplicación web está construida con React, TypeScript, Vite y Supabase.

## Ejecución local

1. Configura `.env` en esta carpeta con `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
2. Entra en `web` y ejecuta `npm install`.
3. Inicia el proyecto con `npm run dev`.

## Chatbot inteligente con Gemini

SIGEbot se ejecuta mediante la Edge Function autenticada `sigecom-chat`. La clave de Gemini nunca se incluye en el frontend.

1. Crea una API key en Google AI Studio.
2. Vincula el proyecto con Supabase CLI.
3. Guarda la clave como secreto remoto:

   `supabase secrets set GEMINI_API_KEY=tu_clave`

4. Despliega la función:

   `supabase functions deploy sigecom-chat`

Para desarrollo local, crea `supabase/functions/.env` (está ignorado por Git) con `GEMINI_API_KEY`, `SUPABASE_URL` y `SUPABASE_ANON_KEY`, y sirve la función con Supabase CLI.

El asistente valida la sesión, aplica un límite básico de solicitudes, consulta datos usando el JWT del usuario —por lo que se respetan las políticas RLS— y envía a Gemini solamente el contexto autorizado.

## Estructura

- `web/`: aplicación React.
- `database/`: esquema y migraciones SQL.
- `supabase/functions/sigecom-chat/`: backend seguro del chatbot.
- `docs/`: planificación y documentación del proyecto.
