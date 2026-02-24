# Feature Specification: Autenticación de Usuario

**Status**: Draft
**Priority**: P0
**PRD Reference**: Section 4 — Feature 6
**Author**: Equipo GastoLog
**Last Updated**: 2026-02-24

## Overview

Sistema de autenticación que permite al usuario crear una cuenta, iniciar sesión y cerrar sesión usando email y contraseña, gestionado íntegramente a través de Supabase Auth. Es el feature que activa el acceso al resto de la aplicación: sin sesión autenticada no se puede acceder a ninguna pantalla del área protegida. Adicionalmente, al completar el registro se dispara la inicialización de datos del nuevo usuario (categorías por defecto y preferencias). En modo offline, un usuario con sesión previamente activa puede seguir operando normalmente.

## User Stories

1. Como usuario nuevo, quiero crear una cuenta con mi email y contraseña para que mis gastos estén vinculados a mí y disponibles en cualquier dispositivo.
2. Como usuario registrado, quiero iniciar sesión con mis credenciales para acceder a mi historial y datos personales.
3. Como usuario autenticado, quiero cerrar sesión de forma segura para proteger mis datos en dispositivos compartidos.
4. Como usuario sin conexión que ya inició sesión previamente, quiero seguir registrando gastos sin necesidad de re-autenticarme para no perder el flujo de captura rápida.
5. Como usuario, quiero recibir mensajes de error claros si mis credenciales son incorrectas o si el email ya está registrado, para saber qué acción tomar.

## Acceptance Criteria

- [ ] AC1: El usuario puede registrarse ingresando **email** y **contraseña** (con confirmación) a través de Supabase Auth. Se requiere aceptación de términos.
- [ ] AC2: El usuario puede iniciar sesión con email y contraseña. Si las credenciales son inválidas, se muestra un mensaje de error claro.
- [ ] AC3: Al completar el registro exitosamente, el sistema inicializa automáticamente las **categorías por defecto** y las **preferencias de usuario** (`zona_horaria = "America/Bogota"`, `moneda = "COP"`, `semana_inicia_en = "Lunes"`).
- [ ] AC4: Las rutas del área autenticada (`/app/*`) redirigen a `/auth/login` si no hay sesión activa.
- [ ] AC5: Las rutas públicas (`/auth/login`, `/auth/registro`) redirigen a `/app/dashboard` si ya hay sesión activa.
- [ ] AC6: Todas las operaciones de datos (CRUD de gastos, categorías, presupuestos) requieren usuario autenticado y son protegidas por **RLS en Supabase** (aislamiento por `usuario_id`).
- [ ] AC7: El usuario puede cerrar sesión desde `/app/ajustes`. Al cerrar sesión, los tokens de sesión se eliminan del cliente (localStorage / cookies del SDK).
- [ ] AC8: En modo **offline**, si el usuario tenía una sesión activa previamente, puede seguir operando (registrar, editar, ver historial) usando los datos en IndexedDB. No se requiere re-autenticación.
- [ ] AC9: En modo **offline**, si el usuario **no tenía sesión activa**, se bloquea el acceso a datos y se muestra la pantalla de login (sin posibilidad de operar sin credenciales).
- [ ] AC10: Los errores de autenticación de Supabase se traducen a mensajes amigables en español (sin exponer códigos internos ni mensajes técnicos al usuario).

## Technical Design

### Architecture

La autenticación se apoya íntegramente en el SDK de Supabase JS (`@supabase/supabase-js`). El estado de sesión es la fuente de verdad única: se obtiene del SDK, se persiste en `localStorage` (comportamiento por defecto del SDK), y se expone al árbol de componentes mediante un contexto de React. El middleware de Next.js protege las rutas en servidor; el contexto protege el renderizado en cliente.

```
┌─────────────────────────────────────────────────────────────────┐
│  Next.js Middleware (middleware.ts)                              │
│  - Lee cookie de sesión de Supabase (SSR)                       │
│  - Redirige /app/* → /auth/login si no hay sesión               │
│  - Redirige /auth/* → /app/dashboard si hay sesión              │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│  AuthContext (React Context + Provider)                         │
│  - Estado: { usuario, sesion, cargando }                        │
│  - Suscripción a onAuthStateChange del SDK de Supabase          │
│  - Expone: iniciarSesion(), registrarse(), cerrarSesion()        │
└──────────┬────────────────────────┬────────────────────────────┘
           │                        │
┌──────────▼──────────┐  ┌──────────▼──────────────────────────┐
│  /auth/login        │  │  /auth/registro                     │
│  FormularioLogin    │  │  FormularioRegistro                 │
└──────────┬──────────┘  └──────────┬──────────────────────────┘
           │                        │
           └───────────┬────────────┘
                       ▼
          ┌────────────────────────┐
          │  AuthService           │
          │  (wrapper Supabase)    │
          └────────────┬───────────┘
                       │
          ┌────────────▼───────────┐
          │  Supabase Auth         │
          │  (email + password)    │
          └────────────┬───────────┘
                       │
          ┌────────────▼──────────────────────────────┐
          │  Post-registro: InicializacionUsuario      │
          │  - CategoriaService.inicializarDefaults()  │
          │  - PreferenciasService.inicializar()        │
          └───────────────────────────────────────────┘
```

**Decisiones de diseño:**
- Se usa `@supabase/ssr` para gestión de cookies en Next.js App Router, garantizando que el middleware del servidor pueda leer la sesión sin depender solo de `localStorage`.
- `onAuthStateChange` del SDK actualiza el `AuthContext` en tiempo real, por lo que cualquier expiración o revocación de sesión se refleja instantáneamente en la UI.
- La inicialización de datos del nuevo usuario (`inicializarDefaults`) se ejecuta **una sola vez** en el callback de registro exitoso, antes de redirigir al dashboard. Es idempotente: si se llama de nuevo (por error de red + reintento), no duplica categorías (validación por unicidad de nombre + usuario).
- El modo offline usa la sesión en caché del SDK. Mientras el token no haya expirado o el usuario no haya cerrado sesión explícitamente, el SDK retorna el usuario desde `localStorage` sin hacer red.

### Data Models

```typescript
// Estado del contexto de autenticación
interface AuthState {
  usuario: SupabaseUser | null;   // null si no autenticado
  sesion: Session | null;         // null si no hay sesión activa
  cargando: boolean;              // true durante la verificación inicial
}

// Payload de inicio de sesión
interface IniciarSesionInput {
  email: string;
  password: string;
}

// Payload de registro
interface RegistrarseInput {
  email: string;
  password: string;
  confirmPassword: string;        // Solo validación en cliente; no se envía a Supabase
  aceptaTerminos: boolean;
}

// Errores mapeados a mensajes en español
type CodigoErrorAuth =
  | "invalid_credentials"
  | "email_already_registered"
  | "weak_password"
  | "email_not_confirmed"
  | "network_error"
  | "unknown_error";

interface ErrorAuth {
  codigo: CodigoErrorAuth;
  mensaje: string;                // Mensaje amigable en español
}
```

### Error Message Mapping

| Código Supabase / Condición | Código interno | Mensaje al usuario |
|---|---|---|
| `Invalid login credentials` | `invalid_credentials` | "El email o la contraseña son incorrectos." |
| `User already registered` | `email_already_registered` | "Ya existe una cuenta con ese email. ¿Quieres iniciar sesión?" |
| `Password should be at least 6 characters` | `weak_password` | "La contraseña debe tener al menos 6 caracteres." |
| `Email not confirmed` | `email_not_confirmed` | "Debes confirmar tu email antes de iniciar sesión. Revisa tu bandeja." |
| `fetch failed` / sin conexión | `network_error` | "Sin conexión. Verifica tu red e intenta de nuevo." |
| Cualquier otro error | `unknown_error` | "Ocurrió un error inesperado. Intenta de nuevo." |

### Database Schema (Supabase/Postgres)

La autenticación en sí es gestionada por Supabase Auth (tabla `auth.users`, fuera del schema de la aplicación). No se crea tabla de usuarios propia. El `usuario_id` de `auth.users` se usa como FK en todas las tablas de la app.

```sql
-- No se crea tabla users propia. Se usa auth.users de Supabase.

-- Función para inicializar datos del nuevo usuario (ejecutada desde servidor o cliente)
-- Esta lógica se implementa en el service layer de Next.js, no como trigger de DB,
-- para mantener flexibilidad y evitar errores silenciosos en triggers.

-- Ejemplo de política RLS referenciando auth.users:
-- (ya incluida en cada tabla; se replica aquí para referencia)
CREATE POLICY "aislamiento_por_usuario"
  ON gastos FOR ALL
  USING (auth.uid() = usuario_id);
  -- Patrón idéntico en: categorias, presupuestos, preferencias_usuario
```

### API / Service Layer

```typescript
// src/services/auth-service.ts

class AuthService {
  /**
   * Inicia sesión con email y contraseña vía Supabase Auth.
   * Retorna el usuario autenticado o lanza ErrorAuth.
   */
  async iniciarSesion(input: IniciarSesionInput): Promise<SupabaseUser>;

  /**
   * Registra un nuevo usuario vía Supabase Auth.
   * Si tiene éxito, llama a inicializarDatosUsuario().
   * Retorna el usuario creado o lanza ErrorAuth.
   */
  async registrarse(input: RegistrarseInput): Promise<SupabaseUser>;

  /**
   * Cierra la sesión del usuario actual.
   * Elimina tokens del cliente (localStorage/cookies).
   */
  async cerrarSesion(): Promise<void>;

  /**
   * Retorna el usuario y sesión actuales desde el caché del SDK.
   * No hace llamada de red; funciona offline.
   */
  obtenerSesionActual(): { usuario: SupabaseUser | null; sesion: Session | null };

  /**
   * Traduce errores de Supabase Auth a ErrorAuth con mensajes en español.
   */
  private mapearError(error: AuthError): ErrorAuth;
}

// src/services/inicializacion-usuario-service.ts

class InicializacionUsuarioService {
  /**
   * Inicializa los datos de un usuario recién registrado.
   * Es idempotente: se puede llamar más de una vez sin duplicar datos.
   * - Crea las 9 categorías por defecto (Feature 2)
   * - Crea PreferenciasUsuario con valores por defecto (Feature 8)
   */
  async inicializar(usuarioId: string): Promise<void>;
}
```

```typescript
// src/contexts/auth-context.tsx

interface AuthContextValue extends AuthState {
  iniciarSesion: (input: IniciarSesionInput) => Promise<void>;
  registrarse: (input: RegistrarseInput) => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

// src/hooks/useAuth.ts — acceso al contexto
function useAuth(): AuthContextValue;
```

```typescript
// middleware.ts (Next.js — protección de rutas en servidor)

export async function middleware(request: NextRequest) {
  // Rutas protegidas: /app/*
  // Rutas públicas: /auth/*, /
  // Lógica: verificar sesión Supabase en cookie → redirigir si aplica
}

export const config = {
  matcher: ["/app/:path*", "/auth/:path*", "/"],
};
```

### Components

| Componente | Responsabilidad |
|---|---|
| `AuthProvider` | Envuelve la app. Inicializa el SDK de Supabase, suscribe a `onAuthStateChange`, expone `AuthContext`. |
| `PaginaLogin` | Page en `/auth/login/page.tsx`. Renderiza `FormularioLogin`. Redirige a dashboard si ya hay sesión. |
| `FormularioLogin` | Campos email + contraseña. Botón "Iniciar sesión". Link a registro. Muestra `AlertaError` si falla. |
| `PaginaRegistro` | Page en `/auth/registro/page.tsx`. Renderiza `FormularioRegistro`. |
| `FormularioRegistro` | Campos email + contraseña + confirmar contraseña + checkbox de términos. Muestra `AlertaError` si falla. |
| `AlertaError` | Mensaje de error amigable inline (no bloquea el formulario). Se limpia al editar los campos. |
| `BotonCerrarSesion` | Botón en `/app/ajustes`. Llama a `cerrarSesion()` con confirmación previa. |
| `GuardaRuta` | HOC/wrapper client-side que verifica sesión en `AuthContext`. Complementa el middleware para evitar flash de contenido protegido. |
| `PantallaCarga` | Spinner/skeleton mostrado mientras `cargando = true` en `AuthState` (verificación inicial de sesión). |

### Route Protection Flow

```
Petición a /app/dashboard
        │
        ▼
┌─────────────────────────────┐
│  middleware.ts              │
│  ¿Hay cookie de sesión?     │
└──────┬──────────┬───────────┘
       │ Sí       │ No
       ▼          ▼
  Continúa   Redirect → /auth/login
       │
       ▼
┌─────────────────────────────┐
│  AuthProvider               │
│  onAuthStateChange          │
│  ¿sesion != null?           │
└──────┬──────────┬───────────┘
       │ Sí       │ No (expiró entre MW y render)
       ▼          ▼
  Renderiza   Redirect → /auth/login
  /app/dashboard
```

### Offline Session Behavior

| Escenario | Comportamiento |
|---|---|
| Usuario con sesión activa + sin red | SDK retorna sesión desde `localStorage`. App funciona normalmente (datos de IndexedDB). |
| Usuario sin sesión + sin red | `obtenerSesionActual()` retorna `null`. Middleware redirige a `/auth/login`. Login intenta conectar → muestra error `network_error`. |
| Token expirado + sin red | El SDK no puede refrescar el token. `onAuthStateChange` emite `SIGNED_OUT`. El usuario es redirigido al login. |
| Token expirado + con red | El SDK refresca el token automáticamente. El usuario no percibe interrupción. |

## UI/UX Considerations

- **Sin confirmación de email en MVP**: para reducir fricción, Supabase se configura con confirmación de email **desactivada** en el entorno de desarrollo/MVP. Si se activa en producción, el mensaje de error `email_not_confirmed` debe guiar al usuario a revisar su bandeja.
- **Contraseña mínima**: Supabase requiere mínimo 6 caracteres. La validación en cliente se alinea con este mínimo para evitar errores de red innecesarios.
- **Persistencia de sesión**: el SDK de Supabase persiste la sesión por defecto. El usuario no tiene que re-autenticarse al abrir la app (a menos que el token haya expirado o haya cerrado sesión).
- **Flash de contenido protegido**: el `GuardaRuta` en cliente y la `PantallaCarga` previenen que el usuario vea brevemente contenido del área protegida mientras se verifica la sesión.
- **Formularios limpios al navegar**: al navegar entre login y registro, los formularios se limpian y los errores se resetean.

## Dependencies

- **Feature 2 (Categorización)**: `registrarse()` llama a `CategoriaService.inicializarDefaults()` post-registro.
- **Feature 7 (Offline/Sync)**: el SyncEngine necesita `usuario_id` de la sesión para autenticar las operaciones de sync con Supabase.
- **Feature 8 (Configuración)**: `registrarse()` llama a `PreferenciasService.inicializar()` post-registro para crear las preferencias con valores por defecto.
- **Todos los features de datos (1, 2, 3, 4, 5)**: requieren `usuario_id` autenticado para cualquier operación CRUD. La RLS en Supabase bloquea cualquier acceso sin autenticación.

## Edge Cases

| Caso | Comportamiento esperado |
|---|---|
| Email con mayúsculas al registrarse (ej. `Usuario@Mail.com`) | Supabase normaliza a minúsculas internamente. Tratar el email como case-insensitive en la UI también para evitar confusión. |
| Contraseñas que no coinciden en el formulario de registro | Validación en cliente `onSubmit` y `onBlur` en el campo de confirmación. No se llama a Supabase. |
| Checkbox de términos no marcado | Deshabilitar el botón de registro hasta que esté marcado. |
| Usuario intenta registrarse con email ya existente | Supabase retorna error → mapear a `email_already_registered` con link a login. |
| Token expirado al abrir la app con red disponible | SDK refresca automáticamente. Si falla el refresh, `onAuthStateChange` emite `SIGNED_OUT` y el usuario va al login. |
| Cierre de sesión sin conexión | Limpiar tokens locales del SDK igualmente. Cuando recupere red, la sesión ya no será válida en el servidor. |
| `inicializarDatosUsuario()` falla por error de red | El usuario llega al dashboard con las listas vacías. Se reintenta la inicialización en la siguiente apertura de la app si el estado de inicialización no está marcado como completo en `PreferenciasUsuario`. |
| Dos tabs abiertas: cerrar sesión en una | `onAuthStateChange` en la segunda tab también emite `SIGNED_OUT` y redirige al login. |
| Acceso directo a URL protegida sin sesión | Middleware redirige a `/auth/login`. Tras el login, se redirige al dashboard (no se conserva la URL original en MVP). |

## Testing Strategy

### Unit Tests
- `mapearError()` traduce correctamente cada código de error de Supabase al mensaje en español correspondiente.
- Validación de `RegistrarseInput`: contraseñas que no coinciden, email inválido, contraseña menor a 6 caracteres.
- `obtenerSesionActual()` retorna `null` cuando no hay sesión en caché.

### Integration Tests
- `registrarse()` crea usuario en Supabase Auth y llama a `inicializarDatosUsuario()`.
- `inicializarDatosUsuario()` crea 9 categorías y preferencias por defecto; segunda llamada no duplica datos.
- `iniciarSesion()` con credenciales correctas retorna sesión válida.
- `iniciarSesion()` con credenciales incorrectas retorna `ErrorAuth` con código `invalid_credentials`.
- `cerrarSesion()` elimina la sesión del contexto y del localStorage del SDK.
- Middleware: petición a `/app/dashboard` sin cookie redirige a `/auth/login`.
- Middleware: petición a `/auth/login` con cookie activa redirige a `/app/dashboard`.
- RLS: intentar leer gastos de otro `usuario_id` via Supabase retorna vacío.

### E2E Tests
- Flujo completo de registro: ingresar email + contraseña → aceptar términos → registrarse → ver dashboard con categorías por defecto.
- Flujo de login: ingresar credenciales correctas → ver dashboard.
- Flujo de error: ingresar contraseña incorrecta → ver mensaje de error en español.
- Flujo de cierre de sesión: presionar "Cerrar sesión" → confirmar → ver pantalla de login → intentar acceder a `/app/dashboard` → redirigido al login.
- Flujo offline: iniciar sesión → desconectar red → reabrir app → acceder al dashboard sin re-autenticarse.

## Security Considerations

- **RLS obligatoria**: cada tabla de datos (`gastos`, `categorias`, `presupuestos`, `preferencias_usuario`) tiene políticas RLS que filtran por `auth.uid() = usuario_id`. Esto garantiza aislamiento incluso si hay bugs en el service layer del cliente.
- **No se almacena contraseña**: Supabase gestiona el hash de contraseñas. La app nunca almacena ni lee contraseñas.
- **Tokens de sesión**: gestionados exclusivamente por el SDK de Supabase. No se leen ni manipulan manualmente.
- **Variables de entorno**: `SUPABASE_URL` y `SUPABASE_ANON_KEY` se exponen al cliente (son públicas por diseño de Supabase); la `SERVICE_ROLE_KEY` nunca se expone al cliente.
- **HTTPS obligatorio**: la app debe desplegarse con HTTPS para proteger la transmisión de credenciales.

## Out of Scope

- Login con proveedores OAuth (Google, GitHub, etc.).
- Recuperación de contraseña por email (flujo "olvidé mi contraseña").
- Autenticación con Magic Link.
- Multi-factor authentication (MFA).
- Gestión de sesiones activas (ver y revocar dispositivos).
- Roles o permisos dentro de la app (todos los usuarios tienen el mismo nivel de acceso a sus datos).
- Confirmación de email obligatoria en el MVP.
