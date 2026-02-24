# Feature Specification: Configuración Mínima (COP y Periodos)

**Status**: Draft
**Priority**: P0
**PRD Reference**: Section 4 — Feature 8
**Author**: Equipo GastoLog
**Last Updated**: 2026-02-24

## Overview

Módulo de preferencias de usuario que almacena y provee los valores de configuración necesarios para que los cálculos de periodos, moneda y agrupación por día/semana/mes funcionen correctamente en todo el sistema. En el MVP, los valores se establecen con defaults automáticos al crear la cuenta y se exponen como solo lectura en la pantalla de Ajustes. No hay UI de edición en Fase 1. Este feature es silencioso para el usuario: actúa como base de datos de contexto que los demás features consumen para ser correctos.

## User Stories

1. Como usuario nuevo, quiero que la app esté lista para usar en Colombia (COP, hora de Bogotá, semana desde el lunes) sin necesidad de configurar nada.
2. Como usuario, quiero que el total del día, la semana y el mes se calculen con mis horarios reales para que los cortes de periodo tengan sentido.
3. Como usuario, quiero ver en Ajustes qué moneda y zona horaria está usando la app para entender el contexto de mis datos.
4. Como usuario avanzado (Fase 2), quiero poder cambiar el día de inicio de semana entre lunes y domingo para adaptar la app a mi preferencia personal.

## Acceptance Criteria

- [ ] AC1: Al completar el registro, se crean automáticamente las `PreferenciasUsuario` con los valores por defecto: `moneda = "COP"`, `zona_horaria = "America/Bogota"`, `semana_inicia_en = "Lunes"`.
- [ ] AC2: La moneda **COP** se usa en todos los cálculos y visualizaciones de la app. No hay soporte multi-moneda en el MVP.
- [ ] AC3: Los rangos de periodo (Hoy, Semana, Mes) en el dashboard, historial y presupuestos se calculan usando la `zona_horaria` del usuario para determinar los cortes de día correctos.
- [ ] AC4: La Semana se calcula iniciando en **lunes** por defecto (configurable en Fase 2).
- [ ] AC5: Las preferencias se muestran en `/app/ajustes` como **solo lectura** en el MVP.
- [ ] AC6: Las preferencias se almacenan en IndexedDB (para disponibilidad offline) y en Supabase (para persistencia multi-dispositivo).
- [ ] AC7: Todos los features que necesiten `zona_horaria` o `semana_inicia_en` los leen desde un único punto (hook `usePreferencias()`), garantizando consistencia.
- [ ] AC8: Si las preferencias no están disponibles (primer arranque sin red), los cálculos usan los valores por defecto (`"America/Bogota"`, `"Lunes"`) como fallback.

## Technical Design

### Architecture

`PreferenciasUsuario` es una entidad 1:1 con el usuario. Se crea durante la inicialización post-registro (`InicializacionUsuarioService`, Feature 6), se carga en IndexedDB y se expone via `PreferenciasContext` al árbol de componentes. Es de solo lectura en el MVP: no genera operaciones de sync salvo en la creación inicial.

```
┌──────────────────────────────────────────────────────────────┐
│  InicializacionUsuarioService (post-registro, Feature 6)     │
│  PreferenciasService.inicializar(usuarioId)                  │
│    → Escribe en IndexedDB                                    │
│    → Escribe en Supabase (directo, sin cola de sync)         │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│  PreferenciasContext (React Context + Provider)              │
│  - Carga PreferenciasUsuario desde IndexedDB al iniciar      │
│  - Fallback a defaults si no hay datos                       │
│  - Expone: preferencias, cargando                            │
└──────────────────────────────┬───────────────────────────────┘
                               │ usePreferencias()
          ┌────────────────────┼──────────────────────┐
          ▼                    ▼                      ▼
   DashboardService    PresupuestoService      HistorialPage
   calcularRango()     calcularConsumos()      (filtro fechas)
```

**Decisiones de diseño:**
- Las preferencias **no pasan por la cola de sync** (Feature 7). En el MVP son de solo lectura post-creación, por lo que la escritura en Supabase es directa al momento del registro.
- Se exponen como **contexto global** para evitar prop drilling. Cualquier componente puede consumirlas con `usePreferencias()`.
- El fallback a defaults garantiza que la app nunca rompa por ausencia de preferencias, incluso en el primer arranque sin red.

### Data Models

```typescript
// Entidad persistida
interface PreferenciasUsuario {
  usuario_id: string;             // UUID de Supabase Auth (PK)
  moneda: string;                 // Siempre "COP" en MVP
  zona_horaria: string;           // IANA timezone string, ej. "America/Bogota"
  semana_inicia_en: DiaSemana;    // "Lunes" | "Domingo"
  creado_en: string;              // ISO 8601 timestamp
  actualizado_en: string;         // ISO 8601 timestamp
}

type DiaSemana = "Lunes" | "Domingo";

// Valores por defecto (usados al crear cuenta y como fallback offline)
const PREFERENCIAS_DEFAULT: Omit<PreferenciasUsuario, "usuario_id" | "creado_en" | "actualizado_en"> = {
  moneda: "COP",
  zona_horaria: "America/Bogota",
  semana_inicia_en: "Lunes",
};

// Estado del contexto
interface PreferenciasContextValue {
  preferencias: PreferenciasUsuario;  // Nunca null (fallback a defaults)
  cargando: boolean;
}
```

### Database Schema (Supabase/Postgres)

```sql
CREATE TABLE preferencias_usuario (
  usuario_id UUID PRIMARY KEY REFERENCES auth.users(id),
  moneda TEXT NOT NULL DEFAULT 'COP',
  zona_horaria TEXT NOT NULL DEFAULT 'America/Bogota',
  semana_inicia_en TEXT NOT NULL DEFAULT 'Lunes'
    CHECK (semana_inicia_en IN ('Lunes', 'Domingo')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE preferencias_usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario ve sus preferencias"
  ON preferencias_usuario FOR ALL
  USING (auth.uid() = usuario_id);
```

### API / Service Layer

```typescript
// src/services/preferencias-service.ts

class PreferenciasService {
  /**
   * Crea las preferencias por defecto para un usuario nuevo.
   * Escribe simultáneamente en IndexedDB y en Supabase (directo, sin cola).
   * Es idempotente: si ya existen, no hace nada.
   */
  async inicializar(usuarioId: string): Promise<PreferenciasUsuario>;

  /**
   * Carga las preferencias del usuario desde IndexedDB.
   * Si no existen, retorna PREFERENCIAS_DEFAULT con el usuarioId.
   */
  async obtener(usuarioId: string): Promise<PreferenciasUsuario>;

  /**
   * Actualiza las preferencias (Fase 2).
   * Escribe en IndexedDB y en Supabase (directo, sin cola).
   */
  async actualizar(
    usuarioId: string,
    cambios: Partial<Pick<PreferenciasUsuario, "zona_horaria" | "semana_inicia_en">>
  ): Promise<PreferenciasUsuario>;
}
```

```typescript
// src/contexts/preferencias-context.tsx

// Provider que carga preferencias al montar y las expone al árbol
function PreferenciasProvider({ children }: { children: React.ReactNode }): JSX.Element;

// src/hooks/usePreferencias.ts
function usePreferencias(): PreferenciasContextValue;

// Helpers de cálculo de rango (usados por Dashboard, Historial, Presupuestos)
// src/lib/periodos.ts

function calcularRangoHoy(zona_horaria: string): { desde: Date; hasta: Date };

function calcularRangoSemana(
  zona_horaria: string,
  semana_inicia_en: DiaSemana
): { desde: Date; hasta: Date };

function calcularRangoMes(zona_horaria: string): { desde: Date; hasta: Date };

/**
 * Convierte un timestamp ISO a "YYYY-MM" usando la zona horaria del usuario.
 * Usado por PresupuestoService para asignar gastos al mes correcto.
 */
function toYYYYMM(isoTimestamp: string, zona_horaria: string): string;

/**
 * Convierte un timestamp ISO a "YYYY-MM-DD" en la zona horaria del usuario.
 * Usado por DashboardService para agrupar gastos por día.
 */
function toLocalDate(isoTimestamp: string, zona_horaria: string): string;
```

### Components (/app/ajustes)

| Componente | Responsabilidad |
|---|---|
| `PaginaAjustes` | Page en `/app/ajustes/page.tsx`. Muestra preferencias (solo lectura) y acciones de sesión/sync. |
| `SeccionPreferencias` | Bloque visual con las 3 preferencias actuales. |
| `ItemPreferencia` | Fila: etiqueta + valor actual. Ej: "Moneda — COP", "Zona horaria — América/Bogotá", "Semana inicia — Lunes". |
| `SeccionSesion` | `BotonCerrarSesion` (Feature 6) + info del email del usuario autenticado. |
| `SeccionSync` | Contador de operaciones pendientes/en error + link a `/app/sync`. |

### Ajustes Page Layout

```
/app/ajustes
├── Preferencias (solo lectura en MVP)
│   ├── Moneda: COP
│   ├── Zona horaria: América/Bogotá
│   └── Semana inicia en: Lunes
│
├── Sincronización
│   ├── X pendientes · Y errores
│   └── → Ver detalles (/app/sync)
│
└── Sesión
    ├── usuario@email.com
    └── [Cerrar sesión]
```

### Timezone Calculation Examples

```typescript
// Ejemplo de por qué zona_horaria es crítica para los cálculos

// Usuario en "America/Bogota" (UTC-5)
// Un gasto registrado a las 23:30 del 24 feb (hora Bogotá)
// = 04:30 del 25 feb en UTC

const gastoFechaHora = "2026-02-25T04:30:00.000Z"; // UTC en Supabase

// SIN zona horaria (usando UTC):
toLocalDate(gastoFechaHora, "UTC") // → "2026-02-25" ❌ (parece del 25)

// CON zona horaria correcta:
toLocalDate(gastoFechaHora, "America/Bogota") // → "2026-02-24" ✅ (es del 24)

// El usuario registró el gasto el martes 24 a las 11:30pm.
// Sin zona horaria, aparecería agrupado en el miércoles 25. ❌
```

### Phase 2 — Editable Preferences

En Fase 2, la pantalla de Ajustes habilitará la edición de `semana_inicia_en`. La arquitectura ya está preparada:

- `PreferenciasService.actualizar()` existe pero no se expone en UI en el MVP.
- El schema de DB ya incluye el campo con CHECK constraint.
- `PreferenciasContext` re-emitirá el valor actualizado a todos los consumidores automáticamente.
- El cambio de `semana_inicia_en` recalcula el dashboard/historial al vuelo (ya consumen del contexto).

La edición de `zona_horaria` se diferiere a Fase 3 por mayor complejidad (retroactividad de datos históricos).

## Dependencies

- **Feature 6 (Autenticación)**: `InicializacionUsuarioService` llama a `PreferenciasService.inicializar()` post-registro.
- **Feature 3 (Dashboard)**: `DashboardService.calcularRango()` consume `zona_horaria` y `semana_inicia_en`.
- **Feature 4 (Historial)**: la traducción de `periodo` a rango de fechas consume `zona_horaria`.
- **Feature 5 (Presupuestos)**: `PresupuestoService.calcularConsumos()` consume `zona_horaria` vía `toYYYYMM()`.
- **Feature 7 (Offline/Sync)**: las preferencias se leen desde IndexedDB garantizando disponibilidad offline. No generan operaciones en la cola de sync (escritura directa en Supabase).

## Edge Cases

| Caso | Comportamiento esperado |
|---|---|
| Primer arranque sin red (preferencias no en IndexedDB) | Usar `PREFERENCIAS_DEFAULT` como fallback. Al recuperar red, cargar desde Supabase y actualizar IndexedDB. |
| `zona_horaria` inválida o desconocida por el runtime de Intl | Capturar excepción en `toLocalDate()` / `toYYYYMM()` y hacer fallback a `"America/Bogota"`. Loguear el error para diagnóstico. |
| `inicializar()` llamado dos veces (retry post-error de red) | Idempotente: verificar existencia antes de insertar. Si ya existen, retornar las existentes sin modificar. |
| Usuario cambia dispositivo / nuevo browser | Las preferencias se cargan desde Supabase al primer sync y se persisten en IndexedDB del nuevo dispositivo. |
| Diferencia de offset en DST (Colombia no tiene DST, pero otros pueden) | `Intl.DateTimeFormat` con la IANA timezone maneja DST automáticamente. No requiere lógica adicional en el MVP (el target es Colombia). |
| `semana_inicia_en` con valor inesperado en IndexedDB | Validar al leer: si el valor no es `"Lunes"` o `"Domingo"`, usar `"Lunes"` como fallback. |

## Testing Strategy

### Unit Tests
- `calcularRangoHoy("America/Bogota")` retorna el rango 00:00–23:59 del día actual en hora Bogotá.
- `calcularRangoSemana("America/Bogota", "Lunes")` retorna rango iniciando el lunes de la semana actual.
- `calcularRangoSemana("America/Bogota", "Domingo")` retorna rango iniciando el domingo.
- `toYYYYMM("2026-02-25T04:30:00Z", "America/Bogota")` retorna `"2026-02"` (no `"2026-02"` por UTC, sino el correcto en hora local).
- `toLocalDate("2026-02-25T04:30:00Z", "America/Bogota")` retorna `"2026-02-24"`.
- `PreferenciasService.inicializar()` es idempotente (segunda llamada no duplica ni modifica).
- Fallback correcto cuando `zona_horaria` es inválida.

### Integration Tests
- Post-registro: `preferencias_usuario` existe en IndexedDB y en Supabase con los valores correctos.
- `usePreferencias()` retorna `PREFERENCIAS_DEFAULT` cuando IndexedDB está vacío.
- Cambiar `semana_inicia_en` (Fase 2) → `usePreferencias()` retorna el nuevo valor → `calcularRangoSemana()` usa el valor actualizado.

### E2E Tests
- Registrar usuario → ir a Ajustes → verificar que Moneda = COP, Zona horaria = América/Bogotá, Semana inicia = Lunes.
- Registrar gasto a las 11:30pm (hora Bogotá) → ir a Dashboard "Hoy" → gasto aparece en el día correcto.

## Performance Requirements

- **Carga de preferencias**: < 20ms desde IndexedDB (objeto único, sin queries complejas).
- **`calcularRango*()`**: < 5ms (operaciones de fecha puras, sin I/O).
- **`toLocalDate()` / `toYYYYMM()`**: < 1ms por llamada (se llama por cada gasto al calcular agregados).

## Out of Scope

- Multi-moneda (diferido indefinidamente del MVP).
- Edición de zona horaria en UI (diferido a Fase 3 por complejidad de retroactividad).
- Edición de `semana_inicia_en` en UI (diferido a Fase 2).
- Detección automática de zona horaria del dispositivo (`Intl.DateTimeFormat().resolvedOptions().timeZone`) como sugerencia al usuario (diferido a Fase 2).
- Preferencias de idioma / localización.
- Temas visuales (modo oscuro/claro).
- Formato de fecha configurable (DD/MM/YYYY vs MM/DD/YYYY).
