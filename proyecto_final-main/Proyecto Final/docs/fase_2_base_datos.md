# SIGECOM - Fase 2: Base de Datos

## 1. Objetivo

Esta fase define la base de datos completa de SIGECOM para Supabase/PostgreSQL, incluyendo:

- tablas
- claves primarias y foraneas
- restricciones
- datos iniciales
- funciones auxiliares
- triggers
- vistas de apoyo para reportes
- politicas basicas RLS
- configuracion inicial de Storage

## 2. Archivo principal

El script listo para ejecutar se encuentra en:

- `database/001_sigecom_supabase.sql`

## 3. Mejoras aplicadas al modelo original

### `auth_user_id` en `usuarios`

Se agrego el campo `auth_user_id uuid unique` para relacionar cada perfil interno con el usuario autenticado en Supabase Auth.

Motivo:

- la autenticacion vive en `auth.users`
- la informacion funcional vive en `public.usuarios`
- este enlace permite saber quien esta autenticado y que rol tiene dentro del sistema

### Tabla `comision_miembros`

Se agrego esta tabla porque el modelo original no resolvia bien dos necesidades importantes:

- quienes pertenecen a una comision
- quienes pueden votar en propuestas

Motivo:

- permite asociar usuarios a comisiones
- permite controlar `puede_votar`
- permite aplicar permisos mas realistas

### Campos de apoyo tecnico

Se agregaron campos como:

- `fecha_actualizacion`
- `creado_por`
- `resultado_final`
- `bucket`
- `ruta_storage`

Motivo:

- mejor trazabilidad
- mejor integracion con la app
- mejor soporte para auditoria, archivos y reportes

## 4. Como ejecutar el SQL en Supabase

### Opcion recomendada: SQL Editor

1. Abre tu proyecto en Supabase.
2. En el menu lateral entra a `SQL Editor`.
3. Crea una nueva consulta con `New query`.
4. Abre el archivo `database/001_sigecom_supabase.sql`.
5. Copia todo el contenido del archivo.
6. Pegalo completo en el editor SQL de Supabase.
7. Presiona `Run`.

### Que deberia ocurrir al ejecutarlo

Si todo salio bien, Supabase creara:

- las tablas del esquema `public`
- indices
- funciones
- triggers
- vistas
- politicas RLS
- el bucket `sigecom-archivos`
- roles y estados iniciales

## 5. Verificacion sugerida despues de ejecutar

Revisa estos puntos dentro de Supabase:

- `Table Editor`
  - `roles`
  - `usuarios`
  - `estados`
  - `comisiones`
  - `comision_miembros`
  - `presupuestos`
  - `movimientos_financieros`
  - `propuestas`
  - `votos`
  - `reportes`
  - `notificaciones`
  - `archivos`
  - `historial_cambios`

- `Storage`
  - bucket `sigecom-archivos`

- `Authentication`
  - cuando registres un usuario nuevo, debe aparecer su perfil en `public.usuarios` por trigger

## 6. Como se relaciona Supabase Auth con la tabla `usuarios`

El flujo correcto sera este:

1. Supabase Auth crea el usuario en `auth.users`.
2. El trigger `on_auth_user_created` se ejecuta automaticamente.
3. Ese trigger inserta un registro en `public.usuarios`.
4. El campo `usuarios.auth_user_id` guarda el `auth.users.id`.
5. Desde la app, al iniciar sesion, se usa `auth.uid()` para encontrar el perfil interno y su rol.

En otras palabras:

- `auth.users` responde "quien esta autenticado"
- `public.usuarios` responde "quien es esa persona dentro de SIGECOM"

## 7. Recomendacion operativa importante

El trigger crea perfiles nuevos con el rol `Miembro`.

Por eso, despues de crear tu primer usuario real en Supabase Auth, debes promover manualmente uno de ellos a `Administrador` con una actualizacion simple en `usuarios`.

Ejemplo:

```sql
update public.usuarios
set id_rol = (
    select id_rol from public.roles where nombre = 'Administrador'
)
where correo = 'tu_correo@ejemplo.com';
```

## 8. Notas sobre seguridad

Las politicas RLS incluidas son una base funcional, no el punto final definitivo.

Incluyen:

- lectura controlada por autenticacion
- escritura restringida por rol
- acceso personal a notificaciones
- voto solo por usuarios autorizados
- archivos controlados por pertenencia o rol

En fases posteriores, la app reforzara estos controles tambien desde servicios Python.
