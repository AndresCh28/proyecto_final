# Documento técnico de SIGECOM

## Arquitectura

SIGECOM es una SPA construida con React, TypeScript y Vite. Supabase proporciona PostgreSQL, Auth, Row Level Security, Realtime, Storage y Edge Functions. Gemini se integra mediante una Edge Function; ninguna clave secreta se almacena en el navegador.

## Autenticación

El acceso usa correo, contraseña y TOTP. Las sesiones verificadas alcanzan `aal2`. Las tablas sensibles incluyen políticas restrictivas que exigen este nivel, además de sus políticas de propiedad, rol y espacio.

## Aislamiento

`espacio_miembros` relaciona usuarios y espacios. Las consultas operativas se limitan al espacio activo y RLS aplica la validación nuevamente en PostgreSQL. La interfaz no constituye una barrera de autorización.

## Datos y archivos

Presupuestos, propuestas, votos, mensajes, notificaciones y bitácoras están aislados por espacio. Storage protege lectura, carga, actualización y eliminación. Los PDF se generan en el cliente a partir de información ya autorizada.

## Tiempo real

Supabase Realtime actualiza chats, presencia, lectura y notificaciones. Los canales incluyen identificadores de usuario o espacio y los mensajes se validan contra el contexto activo.

## Rendimiento

Las páginas usan carga diferida por ruta. El paquete inicial se redujo de aproximadamente 1,037 kB a 210 kB; las bibliotecas de PDF se descargan únicamente al abrir módulos que las necesitan.

## Pruebas

Vitest ejecuta la matriz de permisos de frontend. `supabase/tests/security_policy_audit.sql` detecta políticas globales y tablas sensibles sin AAL2. Antes de publicar deben ejecutarse `npm test`, `npm run build` y la auditoría SQL.

