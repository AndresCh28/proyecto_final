# SIGECOM - Fase 1: Planificacion Tecnica

## 1. Alcance del sistema

SIGECOM sera una aplicacion movil en Python con Kivy orientada a Android, con Supabase como backend para autenticacion, base de datos, almacenamiento y seguridad basica por politicas.

El sistema se organizara en modulos funcionales:

- Autenticacion y sesion
- Gestion de comisiones
- Presupuestos
- Control financiero
- Propuestas y votacion
- Reportes
- Notificaciones
- Perfil y roles
- Archivos
- Auditoria

## 2. Observaciones sobre la base actual

La base existente ya tiene:

- `main.py`
- `database.py`
- `sigecom.kv`
- `.env`

Mejoras necesarias detectadas:

- Separar pantallas en modulos independientes.
- Mover configuracion sensible a variables de entorno.
- Centralizar la conexion a Supabase.
- Evitar que la navegacion este acoplada directamente al archivo KV principal.
- Preparar el proyecto para crecer sin mezclar UI, logica y acceso a datos.

## 3. Arquitectura propuesta

Se propone una arquitectura modular en capas ligeras:

### Capa de presentacion

Responsable de pantallas Kivy, widgets reutilizables, navegacion y captura de interacciones del usuario.

### Capa de servicios

Responsable de comunicarse con Supabase Auth, PostgREST y Storage. Aqui viviran las reglas de acceso a backend y las operaciones CRUD.

### Capa de dominio ligero

Responsable de representar entidades y estructuras de datos del negocio para mantener nombres consistentes y validaciones simples.

### Capa de utilidades

Responsable de helpers transversales como validaciones, formato de fechas, manejo de mensajes, sesion local y configuracion.

## 4. Estructura de carpetas propuesta

```text
Proyecto Final/
├── .env
├── .gitignore
├── README.md
├── requirements.txt
├── main.py
├── config.py
├── docs/
│   ├── fase_1_planificacion.md
│   ├── arquitectura.md
│   └── base_datos.md
├── assets/
│   ├── images/
│   ├── icons/
│   └── fonts/
├── kv/
│   ├── common.kv
│   ├── login.kv
│   ├── dashboard.kv
│   ├── comisiones.kv
│   ├── detalle_comision.kv
│   ├── presupuestos.kv
│   ├── propuestas.kv
│   ├── votacion.kv
│   ├── reportes.kv
│   ├── notificaciones.kv
│   └── perfil.kv
├── screens/
│   ├── __init__.py
│   ├── base_screen.py
│   ├── login_screen.py
│   ├── dashboard_screen.py
│   ├── comisiones_screen.py
│   ├── detalle_comision_screen.py
│   ├── presupuestos_screen.py
│   ├── propuestas_screen.py
│   ├── votacion_screen.py
│   ├── reportes_screen.py
│   ├── notificaciones_screen.py
│   └── perfil_screen.py
├── services/
│   ├── __init__.py
│   ├── supabase_client.py
│   ├── auth_service.py
│   ├── user_service.py
│   ├── comision_service.py
│   ├── presupuesto_service.py
│   ├── finanzas_service.py
│   ├── propuesta_service.py
│   ├── votacion_service.py
│   ├── reporte_service.py
│   ├── notificacion_service.py
│   ├── archivo_service.py
│   └── historial_service.py
├── models/
│   ├── __init__.py
│   ├── role.py
│   ├── user.py
│   ├── estado.py
│   ├── comision.py
│   ├── presupuesto.py
│   ├── movimiento.py
│   ├── propuesta.py
│   ├── voto.py
│   ├── notificacion.py
│   ├── archivo.py
│   └── historial.py
├── utils/
│   ├── __init__.py
│   ├── constants.py
│   ├── validators.py
│   ├── formatters.py
│   ├── session.py
│   ├── permissions.py
│   └── dialogs.py
└── tests/
    ├── __init__.py
    ├── test_validators.py
    └── test_services_smoke.py
```

## 5. Convenciones de nombres

### Archivos Python

- Usar `snake_case`.
- Ejemplos: `auth_service.py`, `detalle_comision_screen.py`.

### Clases

- Usar `PascalCase`.
- Ejemplos: `AuthService`, `DetalleComisionScreen`, `SupabaseClient`.

### Variables y funciones

- Usar `snake_case`.
- Ejemplos: `obtener_comisiones`, `usuario_actual`, `cargar_presupuestos`.

### Pantallas

- El nombre de clase debe terminar en `Screen`.
- El nombre en `ScreenManager` debe ir en minuscula y separado por guion bajo solo si hace falta claridad.
- Recomendacion:
  - `login`
  - `dashboard`
  - `comisiones`
  - `detalle_comision`
  - `presupuestos`
  - `propuestas`
  - `votacion`
  - `reportes`
  - `notificaciones`
  - `perfil`

### IDs de Kivy

- Usar `snake_case`.
- Ejemplos: `correo_input`, `password_input`, `comision_list`, `mensaje_error_label`.

### Tablas y columnas SQL

- Mantener nombres en `snake_case`.
- Preferencia: claves primarias con `id` como columna estandar o mantener `id_usuario`, `id_comision`, etc. si el enfoque academico lo requiere.

## 6. Flujo de navegacion propuesto

```text
Login
  -> Dashboard
     -> Comisiones
        -> Detalle de comision
           -> Presupuestos
           -> Propuestas
              -> Votacion
           -> Archivos
           -> Historial
     -> Reportes
     -> Notificaciones
     -> Perfil
     -> Logout -> Login
```

### Reglas de navegacion

- `Login` es la pantalla de entrada.
- Si existe una sesion valida, el usuario entra directo a `Dashboard`.
- `Dashboard` centraliza accesos por modulo.
- `DetalleComision` funciona como nodo de trabajo de una comision concreta.
- `Presupuestos`, `Propuestas` y `Votacion` deben poder abrirse contextualizados por `id_comision`.
- `Perfil` debe permitir cerrar sesion y mostrar rol.
- `Notificaciones` debe ser accesible desde dashboard y desde un icono persistente en futuras versiones.

## 7. Estructura modular recomendada

### Modulo de autenticacion

- Inicio de sesion con Supabase Auth
- Persistencia de sesion local
- Cierre de sesion
- Carga del perfil asociado al usuario autenticado

### Modulo de comisiones

- CRUD de comisiones
- Cambio de estado
- Consulta de detalle
- Asociacion con presupuestos, propuestas, archivos y movimientos

### Modulo financiero

- Registro de ingresos y gastos
- Calculo de balance
- Consolidado por comision

### Modulo de propuestas y votacion

- CRUD de propuestas
- Emision de voto
- Validacion de permisos
- Calculo de resultado por mayoria simple

### Modulo de reportes

- Consultas agregadas reutilizables
- Vista resumida y detallada
- Preparacion para exportacion futura

### Modulo de notificaciones

- Consulta por usuario
- Marcado como leida

### Modulo de archivos

- Subida a Supabase Storage
- Asociacion con comision o propuesta
- Listado y metadatos

### Modulo de auditoria

- Registro de eventos importantes
- Consulta futura para seguimiento

## 8. Dependencias necesarias

Dependencias base recomendadas para Python 3.10:

```txt
kivy==2.3.0
supabase==2.15.0
python-dotenv==1.0.1
requests==2.32.3
```

Dependencias opcionales recomendadas:

```txt
pytest==8.3.5
```

Dependencias futuras probables:

- `kivymd` solo si se decide una capa visual mas rica. No es obligatoria.
- `pandas` para reportes complejos y futura exportacion.
- `reportlab` o `fpdf2` para exportacion PDF.
- `buildozer` para empaquetado Android en entorno Linux.

## 9. Decisiones tecnicas clave

### 9.1 Usar Supabase Auth + tabla `usuarios`

No conviene depender solo de `auth.users`. La app necesita perfil funcional con nombre, telefono, rol y estado activo. Por eso:

- `auth.users` se usa para autenticacion.
- `public.usuarios` se usa para datos de negocio.
- Ambas entidades se relacionan por un campo `auth_user_id UUID UNIQUE`.

### 9.2 Mantener logica de negocio fuera de las pantallas

Las pantallas no deben hacer consultas complejas directamente. Deben delegar en servicios.

### 9.3 Separar KV por pantalla

El archivo unico `sigecom.kv` sirve para prototipado, pero no escala bien. Separar por pantalla mejora mantenibilidad.

### 9.4 Agregar una pantalla `detalle_comision`

Aunque no estaba en tu estructura actual, es importante porque concentra operaciones relacionadas con una comision y evita mezclar demasiada informacion en una sola vista.

## 10. Riesgos tecnicos y mitigacion

### Riesgo 1: acoplamiento fuerte entre Kivy y backend

Problema:
La UI puede volverse dificil de mantener si llama directamente a Supabase.

Mitigacion:
- Usar `services/` como capa intermedia.
- Hacer que cada pantalla invoque metodos de servicio, no consultas directas.

### Riesgo 2: manejo de sesion en Android

Problema:
La persistencia de sesion puede variar entre desarrollo en Windows y despliegue Android.

Mitigacion:
- Guardar el token de forma local controlada.
- Encapsular el almacenamiento de sesion en `utils/session.py`.
- Preparar fallback para reautenticacion silenciosa si el refresh token falla.

### Riesgo 3: seguridad de claves

Problema:
La clave y URL de Supabase no deben quedar hardcodeadas en codigo fuente publico.

Mitigacion:
- Usar `.env`.
- No usar `service_role` en la app cliente.
- Rotar cualquier clave que haya quedado expuesta durante pruebas.

### Riesgo 4: politicas RLS insuficientes

Problema:
Aunque Supabase gestiona auth, si las politicas estan mal definidas podria haber acceso indebido a datos.

Mitigacion:
- Activar RLS en tablas sensibles.
- Restringir acceso segun `auth.uid()` y rol del usuario.
- Centralizar escrituras importantes mediante validaciones de servicio y politicas.

### Riesgo 5: crecimiento desordenado de pantallas

Problema:
Si toda la logica se concentra en `main.py` y un solo KV, el proyecto sera dificil de presentar y mantener.

Mitigacion:
- Aplicar la estructura modular desde Fase 3.
- Mantener `main.py` como punto de entrada liviano.

### Riesgo 6: consultas repetidas y lentitud

Problema:
Pantallas con multiples llamadas a backend pueden sentirse lentas en movil.

Mitigacion:
- Cargar datos por contexto.
- Reutilizar consultas agregadas.
- Evitar recargas completas innecesarias.

### Riesgo 7: reglas de negocio inconsistentes

Problema:
Aprobacion de propuestas, balance financiero o permisos podrian implementarse en muchos lugares.

Mitigacion:
- Centralizar reglas en servicios de negocio.
- Crear helpers como `permissions.py` y funciones de calculo reutilizables.

## 11. Ajustes recomendados al diseno original

### Cambio recomendado 1: agregar `auth_user_id` en `usuarios`

Justificacion:
Es la manera mas limpia de vincular el usuario autenticado de Supabase con el perfil interno de la aplicacion.

### Cambio recomendado 2: agregar campos de auditoria basicos

Se recomienda incluir, cuando aplique:

- `creado_por`
- `actualizado_por`
- `fecha_actualizacion`

Justificacion:
Facilita trazabilidad y mejora la calidad academica del proyecto.

### Cambio recomendado 3: estandarizar estados y tipos con restricciones

Ejemplos:

- tipo de movimiento: `ingreso`, `gasto`
- voto: `a_favor`, `en_contra`, `abstencion`

Justificacion:
Reduce errores de datos y simplifica reportes.

### Cambio recomendado 4: usar soft delete solo si se necesita

Por ahora no es obligatorio. Para el alcance academico, conviene mas usar campo `activo` o cambios de estado antes que borrado logico generalizado.

## 12. Ruta de implementacion por fases

### Fase 2

- Diseno SQL completo
- Relaciones
- Restricciones
- Inserts iniciales
- Politicas RLS base

### Fase 3

- Reestructuracion del proyecto
- Punto de entrada limpio
- Servicios base
- Modulos iniciales

### Fase 4

- Pantallas y navegacion
- Layouts KV separados

### Fase 5

- Login real con Supabase
- Manejo de sesion

### Fase 6

- CRUD funcionales principales

### Fase 7

- Logica de negocio
- Permisos
- Historial

### Fase 8

- Reportes

### Fase 9

- Refactor
- Revision final
- Lista de pendientes

## 13. Resultado esperado al finalizar

La meta es que SIGECOM quede como una aplicacion:

- modular
- presentable academicamente
- mantenible
- preparada para Android
- conectada de forma realista a Supabase
- extensible para futuras mejoras
