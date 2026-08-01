# Procedimiento de respaldo y recuperación

## Frecuencia recomendada

- Base de datos: respaldo diario y antes de cada migración.
- Storage: copia semanal y antes de cambios masivos.
- Código y migraciones: cada cambio aprobado debe quedar versionado.
- Conservación: 30 días para respaldos diarios y 12 meses para cierres mensuales.

## Respaldo

1. Exporte la base con las herramientas oficiales de Supabase/PostgreSQL.
2. Verifique que el respaldo incluya esquema, datos, funciones, políticas y triggers.
3. Copie los buckets privados manteniendo rutas y metadatos.
4. Guarde los archivos cifrados fuera del servidor principal.
5. Registre fecha, responsable, tamaño y resultado de verificación.

Nunca incluya claves `service_role`, claves de Gemini ni secretos OTP en repositorios o documentos.

## Recuperación

1. Declare la incidencia y detenga escrituras si existe corrupción.
2. Cree un proyecto o entorno de recuperación aislado.
3. Restaure esquema y datos; después restaure Storage.
4. Verifique conteos, relaciones, RLS, Auth, MFA y aislamiento entre espacios.
5. Ejecute pruebas automatizadas y un recorrido manual.
6. Cambie credenciales comprometidas antes de reabrir el servicio.

## Prueba del respaldo

Realice una restauración de ensayo al menos una vez al mes. Un archivo no se considera respaldo válido hasta que pueda restaurarse y verificarse.

