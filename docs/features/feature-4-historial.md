# Feature Specification: Historial y Búsqueda de Gastos

**Status**: Draft
**Priority**: P0
**PRD Reference**: Section 4 — Feature 4
**Author**: Equipo GastoLog
**Last Updated**: 2026-02-24

## Overview

Pantalla de consulta y gestión del historial de gastos que permite al usuario revisar, buscar, filtrar, editar y eliminar registros. Los gastos se muestran ordenados por fecha descendente con infinite scroll. El usuario puede filtrar por categoría y rango de fechas, y buscar por texto en el campo `nota`. El historial también actúa como destino de navegación desde el dashboard (filtrado por categoría y periodo). Las ediciones y eliminaciones siguen el patrón offline-first: persisten en IndexedDB primero y se sincronizan con Supabase al recuperar conexión.

## User Stories

1. Como usuario, quiero ver todos mis gastos ordenados del más reciente al más antiguo para revisar mi actividad sin tener que buscar.
2. Como usuario, quiero filtrar gastos por categoría y rango de fechas para encontrar rápidamente un subconjunto de registros.
3. Como usuario, quiero buscar por texto en la nota (ej. "Uber", "farmacia") para localizar un gasto específico sin recordar la fecha exacta.
4. Como usuario, quiero editar un gasto existente (monto, categoría, método de pago, fecha/hora, nota) para corregir errores de registro.
5. Como usuario, quiero eliminar un gasto incorrecto para mantener mi historial limpio, sabiendo que el cambio se sincronizará automáticamente.
6. Como usuario que viene del dashboard, quiero llegar al historial ya filtrado por la categoría y periodo que seleccioné para no tener que reconfigurar los filtros manualmente.
7. Como usuario, quiero ver el indicador de sync de cada gasto (Sincronizado / Pendiente / Error) para saber cuáles aún no se han enviado al servidor.

## Acceptance Criteria

- [ ] AC1: El historial lista gastos ordenados por `fecha_hora` descendente con **infinite scroll** (carga incremental de 20 registros por página).
- [ ] AC2: Cada ítem del historial muestra: monto formateado en COP, nombre de categoría, método de pago, fecha/hora y nota (si existe).
- [ ] AC3: Cada ítem muestra el indicador de `estado_sync` (Sincronizado / Pendiente / Error) de forma no intrusiva.
- [ ] AC4: El usuario puede filtrar por **categoría** (una a la vez) y por **rango de fechas** (fecha desde / fecha hasta). Los filtros son combinables.
- [ ] AC5: El usuario puede buscar por **texto libre** en el campo `nota`. La búsqueda es case-insensitive y se ejecuta sobre los datos locales en IndexedDB.
- [ ] AC6: Al aplicar filtros o búsqueda, la lista se actualiza de forma inmediata (sin recargar la página).
- [ ] AC7: Al navegar desde el dashboard con parámetros de filtro en la URL (`?categoria_id=&periodo=`), el historial carga con esos filtros preseleccionados.
- [ ] AC8: El usuario puede tocar un gasto para abrir la pantalla de edición (`/app/gastos/[id]`).
- [ ] AC9: En la pantalla de edición, el usuario puede modificar: `monto_cop`, `categoria_id`, `metodo_de_pago`, `fecha_hora` y `nota`.
- [ ] AC10: En la pantalla de edición, el usuario puede **eliminar** el gasto. La eliminación es un **soft delete** (`eliminado_en = now()`): el gasto desaparece del historial inmediatamente pero se conserva en base de datos.
- [ ] AC11: Las ediciones y eliminaciones se persisten en IndexedDB primero y se reflejan en el historial sin esperar sync con Supabase.
- [ ] AC12: Si no hay resultados para los filtros/búsqueda activos, se muestra un estado vacío con opción de limpiar filtros.
- [ ] AC13: El historial excluye gastos con `eliminado_en != null`.

## Technical Design

### Architecture

El historial consume gastos desde IndexedDB con soporte de filtros y paginación. La pantalla de edición reutiliza el mismo formulario del Feature 1 prellenado con los datos del gasto seleccionado. Las operaciones de escritura (editar/eliminar) siguen el mismo patrón offline-first que la creación.

```
┌──────────────────────────────────────────────────────────────┐
│  /app/historial (React Page)                                 │
│                                                              │
│  ┌──────────────────┐   ┌────────────────────────────────┐   │
│  │ BarraBusqueda    │   │ PanelFiltros                   │   │
│  │ (texto en nota)  │   │ (categoría + rango de fechas)  │   │
│  └────────┬─────────┘   └───────────────┬────────────────┘   │
│           └──────────────┬──────────────┘                    │
│                          ▼                                   │
│          ┌───────────────────────────────┐                   │
│          │  useHistorial(filtros)        │                   │
│          └───────────────┬───────────────┘                   │
│                          │                                   │
│          ┌───────────────▼───────────────┐                   │
│          │  GastoService.listar(filtros) │                   │
│          │  (IndexedDB + paginación)     │                   │
│          └───────────────┬───────────────┘                   │
│                          │                                   │
│          ┌───────────────▼───────────────┐                   │
│          │  IndexedDB                    │◄── SyncEngine     │
│          └───────────────────────────────┘         │         │
│                                                    ▼         │
│                                               Supabase        │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  ListaGastos (infinite scroll)                        │   │
│  │  ┌─────────────────────────────────────────────────┐  │   │
│  │  │  ItemGasto × N                                  │  │   │
│  │  └─────────────────────────────────────────────────┘  │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  /app/gastos/[id] (React Page — Editar/Eliminar)             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  FormularioGasto (prellenado)  ← reutilizado F1      │    │
│  └──────────────────────┬───────────────────────────────┘    │
│                         │                                    │
│          ┌──────────────▼──────────────┐                     │
│          │  GastoService               │                     │
│          │  .editar() / .eliminar()    │                     │
│          └──────────────┬──────────────┘                     │
│                         ▼                                    │
│                    IndexedDB → SyncEngine → Supabase         │
└──────────────────────────────────────────────────────────────┘
```

**Decisiones de diseño:**
- **Paginación en IndexedDB**: se usa un cursor sobre el índice `(usuario_id, fecha_hora DESC)` para cargar 20 registros por página sin traer todo el dataset a memoria.
- **Búsqueda por nota**: se ejecuta como un scan filtrado en IndexedDB (no hay índice de texto completo). Aceptable para el volumen esperado (~500–2000 gastos por usuario en uso normal).
- **Formulario de edición reutilizado**: `FormularioGasto` del Feature 1 acepta una prop `gastoInicial` que prellena todos los campos. La lógica de guardado se ramifica entre `crear` y `editar` según si hay `id`.
- **Soft delete**: `GastoService.eliminar()` actualiza `eliminado_en = now()` en IndexedDB y encola una operación `UPDATE_GASTO` (con el campo `eliminado_en`) para Supabase. No se usa `DELETE_GASTO` como tipo de operación de sync para preservar integridad referencial y auditoría.

### Data Models

```typescript
// Filtros de consulta del historial
interface FiltrosHistorial {
  categoria_id?: string;          // UUID, opcional
  fecha_desde?: string;           // "YYYY-MM-DD", opcional
  fecha_hasta?: string;           // "YYYY-MM-DD", opcional
  texto?: string;                 // Búsqueda en nota, case-insensitive
}

// Parámetros de paginación
interface PaginacionHistorial {
  limite: number;                 // Default: 20
  cursor?: string;                // fecha_hora del último ítem cargado (para next page)
}

// Resultado paginado
interface ResultadoHistorial {
  gastos: Gasto[];
  hayMas: boolean;                // true si existe al menos un ítem más
  totalFiltrado: number;          // Conteo total con filtros (para UI informativa)
}

// Payload para editar un gasto existente
interface EditarGastoInput {
  id: string;
  monto_cop?: number;
  categoria_id?: string;
  metodo_de_pago?: MetodoDePago;
  fecha_hora?: string;            // ISO 8601; restricción máx 30 días atrás
  nota?: string | null;
}

// Operaciones de sync generadas por editar/eliminar
type TipoOperacionGasto =
  | "CREATE_GASTO"
  | "UPDATE_GASTO"    // También cubre soft delete (actualiza eliminado_en)
  | "DELETE_GASTO";   // Reservado; no usado en MVP (se usa soft delete vía UPDATE)
```

### Database Schema (Supabase/Postgres)

Los cambios del historial no requieren nuevas tablas; operan sobre la tabla `gastos` del Feature 1. Se añaden índices adicionales para las consultas de filtrado:

```sql
-- Índice para búsqueda por nota (búsqueda de texto parcial)
-- Se usa ILIKE en Supabase para case-insensitive; índice de texto mejora rendimiento a escala
CREATE INDEX idx_gastos_nota ON gastos USING gin(to_tsvector('spanish', coalesce(nota, '')));

-- Índice compuesto para filtros por categoría + fecha
CREATE INDEX idx_gastos_categoria_fecha ON gastos (usuario_id, categoria_id, fecha_hora DESC);

-- Filtro de soft delete: índice parcial para gastos activos
CREATE INDEX idx_gastos_activos ON gastos (usuario_id, fecha_hora DESC)
  WHERE eliminado_en IS NULL;
```

**Queries principales (Supabase JS client):**

```sql
-- Historial base (sin filtros)
SELECT * FROM gastos
WHERE usuario_id = $1
  AND eliminado_en IS NULL
ORDER BY fecha_hora DESC
LIMIT 20 OFFSET $2;

-- Con filtro de categoría y rango de fechas
SELECT * FROM gastos
WHERE usuario_id = $1
  AND eliminado_en IS NULL
  AND ($categoria_id IS NULL OR categoria_id = $categoria_id)
  AND ($fecha_desde IS NULL OR fecha_hora >= $fecha_desde::timestamptz)
  AND ($fecha_hasta IS NULL OR fecha_hora <= $fecha_hasta::timestamptz)
ORDER BY fecha_hora DESC
LIMIT 20 OFFSET $2;

-- Con búsqueda por nota
SELECT * FROM gastos
WHERE usuario_id = $1
  AND eliminado_en IS NULL
  AND nota ILIKE '%' || $texto || '%'
ORDER BY fecha_hora DESC
LIMIT 20 OFFSET $2;
```

### API / Service Layer

```typescript
// Extensión de GastoService (src/services/gasto-service.ts)

class GastoService {
  // (métodos de Feature 1: crear, listar base)

  /**
   * Lista gastos con filtros, búsqueda y paginación desde IndexedDB.
   * Excluye soft-deletes (eliminado_en != null).
   */
  async listarFiltrado(
    filtros: FiltrosHistorial,
    paginacion: PaginacionHistorial
  ): Promise<ResultadoHistorial>;

  /**
   * Obtiene un gasto por ID desde IndexedDB.
   */
  async obtenerPorId(id: string): Promise<Gasto | null>;

  /**
   * Edita un gasto existente: actualiza en IndexedDB y encola UPDATE_GASTO.
   */
  async editar(input: EditarGastoInput): Promise<Gasto>;

  /**
   * Soft delete: establece eliminado_en = now() en IndexedDB
   * y encola UPDATE_GASTO (con eliminado_en) para sync con Supabase.
   */
  async eliminar(id: string): Promise<void>;
}
```

```typescript
// src/hooks/useHistorial.ts

function useHistorial(filtros: FiltrosHistorial): {
  gastos: Gasto[];
  cargando: boolean;
  cargandoMas: boolean;
  hayMas: boolean;
  cargarMas: () => void;
  totalFiltrado: number;
  error: string | null;
};

// src/hooks/useEditarGasto.ts

function useEditarGasto(id: string): {
  gasto: Gasto | null;
  cargando: boolean;
  editar: (input: EditarGastoInput) => Promise<void>;
  eliminar: () => Promise<void>;
  guardando: boolean;
  error: string | null;
};
```

### Components

| Componente | Responsabilidad |
|---|---|
| `PaginaHistorial` | Page en `/app/historial/page.tsx`. Lee query params (`categoria_id`, `periodo`) para precargar filtros. |
| `BarraBusqueda` | Input de texto con debounce (300ms) para búsqueda en nota. Botón limpiar. |
| `PanelFiltros` | Sección desplegable con `SelectorCategoria` (solo activas + inactivas) y `SelectorRangoFechas`. |
| `SelectorRangoFechas` | Dos inputs de fecha: "Desde" y "Hasta". Valida que `desde ≤ hasta`. |
| `ListaGastos` | Renderiza `ItemGasto × N` con infinite scroll via `IntersectionObserver`. |
| `ItemGasto` | Fila del historial: monto (COP), nombre categoría (con chip de color), método de pago, fecha/hora relativa, nota truncada a 60 chars, badge de `estado_sync`. Toque → navega a edición. |
| `BadgeEstadoSync` | Ícono/texto: `●` verde (Sincronizado), `●` amarillo (Pendiente), `●` rojo (Error). Solo muestra Pendiente/Error activamente. |
| `PaginaEditarGasto` | Page en `/app/gastos/[id]/page.tsx`. Carga el gasto por ID y pasa `gastoInicial` al formulario. |
| `FormularioGasto` | Reutilizado del Feature 1 con prop `gastoInicial?: Gasto`. Internamente diferencia modo crear vs editar. |
| `BotonEliminar` | Botón destructivo con confirmación (dialog nativo o modal) antes de ejecutar soft delete. |
| `EstadoVacioHistorial` | "No encontramos gastos con estos filtros" + botón "Limpiar filtros". Diferente mensaje si no hay gastos en absoluto. |

### URL Parameters

La página `/app/historial` acepta los siguientes query params para integración con el dashboard:

| Parámetro | Tipo | Descripción |
|---|---|---|
| `categoria_id` | UUID string | Preselecciona el filtro de categoría |
| `periodo` | `"Hoy"` \| `"Semana"` \| `"Mes"` | Traduce el periodo a un rango de fechas `desde/hasta` |
| `fecha_desde` | `"YYYY-MM-DD"` | Fecha de inicio de filtro directo |
| `fecha_hasta` | `"YYYY-MM-DD"` | Fecha de fin de filtro directo |

Cuando se recibe `periodo`, la página calcula `fecha_desde` y `fecha_hasta` usando la zona horaria del usuario (mismo cálculo que el dashboard) y los establece como filtros activos.

### Validation Rules (Edición)

| Campo | Regla | Mensaje de error |
|---|---|---|
| `monto_cop` | Obligatorio, entero > 0 | "Ingresa un monto válido mayor a $0" |
| `categoria_id` | Obligatorio, debe existir | "Selecciona una categoría" |
| `metodo_de_pago` | Obligatorio, valor del enum | "Selecciona un método de pago" |
| `fecha_hora` | No futura; máx 30 días atrás | "La fecha debe estar dentro de los últimos 30 días" |
| `nota` | Opcional, máx 140 caracteres | "La nota no puede superar 140 caracteres" |

## UI/UX Considerations

- **Fecha relativa en ítems**: mostrar "hace 2 horas", "ayer", "lun 17 feb" según la distancia temporal. La fecha completa se muestra en la pantalla de edición.
- **Swipe to delete** (mejora UX mobile): el `ItemGasto` puede soportar swipe izquierdo para mostrar botón eliminar inline, sin abrir la pantalla de edición. Esto es una mejora opcional dentro del MVP si el tiempo lo permite.
- **Filtros persistentes**: los filtros activos se mantienen si el usuario navega a edición y vuelve (usando el estado del router o sessionStorage), para no perder el contexto de búsqueda.
- **Badge de sync discreto**: el indicador de `estado_sync` no debe distraer. Solo se muestra con color diferente para Pendiente/Error; Sincronizado usa un ícono neutro o se omite.
- **Confirmación antes de eliminar**: dado que el soft delete es irreversible desde la perspectiva del usuario (no hay "papelera" en el MVP), se requiere confirmación explícita con el monto y categoría del gasto en el mensaje.

## Dependencies

- **Feature 1 (Registro rápido)**: reutiliza `FormularioGasto` prellenado para edición. Comparte `GastoService` y modelos.
- **Feature 2 (Categorización)**: necesita nombre y color de categoría para mostrar en cada ítem y en el filtro.
- **Feature 3 (Dashboard)**: el dashboard navega al historial con filtros via query params.
- **Feature 7 (Offline/Sync)**: editar y eliminar encolan operaciones `UPDATE_GASTO` en IndexedDB para sync con Supabase.
- **Feature 8 (Configuración)**: necesita `zona_horaria` para traducir `periodo` a rango de fechas correcto.

## Edge Cases

| Caso | Comportamiento esperado |
|---|---|
| Gasto con categoría inactiva | Mostrar el nombre de la categoría tal como está (no "Sin categoría"). En edición, la categoría inactiva aparece seleccionada aunque no esté en la lista activa; si el usuario cambia de categoría, no puede volver a seleccionar la inactiva. |
| Edición de gasto en estado "Error" de sync | Permitir edición normal. Al guardar, resetear `intentos = 0` y marcar como "Pendiente" para reintento. |
| Eliminación de gasto pendiente de sync | Ejecutar soft delete en IndexedDB. El SyncEngine enviará el `UPDATE_GASTO` con `eliminado_en` al reconectar; si el gasto nunca llegó al servidor (era CREATE pendiente), cancelar la operación CREATE de la cola y no enviar nada. |
| Búsqueda con caracteres especiales (ej. `%`, `_`) | Escapar los caracteres especiales antes de la búsqueda ILIKE para evitar interpretación como wildcards. |
| Filtro `fecha_desde > fecha_hasta` | Mostrar error de validación inline: "La fecha inicial no puede ser posterior a la fecha final." |
| Edición de `fecha_hora` a más de 30 días atrás | Rechazar con validación: "Solo puedes registrar gastos de los últimos 30 días." |
| Infinite scroll sin más datos | Ocultar el loader; no hacer más requests. Mostrar "Has llegado al final de tu historial" si la lista tiene ≥ 20 ítems. |
| Dos ediciones simultáneas del mismo gasto (offline + sync) | Last-write-wins por `actualizado_en`: la edición local prevalece si es más reciente. |
| Lista con >2000 gastos | El cursor de IndexedDB carga solo 20 a la vez; no hay problema de memoria. Los filtros reducen el scan. |

## Testing Strategy

### Unit Tests
- `listarFiltrado()` aplica correctamente cada filtro de forma aislada (categoría, fecha_desde, fecha_hasta, texto).
- `listarFiltrado()` combina múltiples filtros con lógica AND.
- `listarFiltrado()` excluye gastos con `eliminado_en != null`.
- `eliminar()` establece `eliminado_en` en IndexedDB y encola `UPDATE_GASTO`.
- `editar()` actualiza `actualizado_en` y encola `UPDATE_GASTO`.
- Escape de caracteres especiales en búsqueda de texto.
- Traducción de `periodo` a rango de fechas (usa zona horaria del usuario).

### Integration Tests
- Crear gasto → buscar por texto de su nota → aparece en resultados.
- Filtrar por categoría → solo aparecen gastos de esa categoría.
- Editar gasto → verificar cambio en IndexedDB y en la lista del historial.
- Eliminar gasto → desaparece del historial → `eliminado_en` está seteado en IndexedDB → operación `UPDATE_GASTO` encolada para sync.
- Navegación con query params: `?categoria_id=X&periodo=Semana` → filtros preseleccionados correctamente.
- Infinite scroll: cargar 20 → scroll → cargar 20 más → verificar no duplicados.

### E2E Tests
- Flujo completo: registrar 5 gastos de categorías distintas → ir a historial → buscar por nota → encontrar el correcto.
- Flujo edición: abrir gasto → cambiar monto → guardar → verificar nuevo monto en historial.
- Flujo eliminación: abrir gasto → eliminar → confirmar diálogo → verificar que desaparece de la lista.
- Flujo desde dashboard: tocar categoría "Alimentación" en dashboard → historial muestra solo gastos de esa categoría.
- Flujo offline: desconectar → editar gasto → reconectar → verificar que el cambio se sincroniza.

## Performance Requirements

- **Carga inicial del historial** (sin filtros): < 200ms desde IndexedDB para los primeros 20 ítems.
- **Aplicar filtro/búsqueda**: < 150ms para mostrar resultados actualizados.
- **Carga de página siguiente** (infinite scroll): < 100ms por página adicional.
- **Apertura de pantalla de edición**: < 150ms para cargar el gasto por ID y renderizar el formulario prellenado.

## Out of Scope

- Búsqueda por monto exacto o rango de montos.
- Filtro por método de pago.
- Ordenamiento alternativo (por monto, por categoría).
- Exportación del historial (CSV, PDF).
- Deshacer eliminación ("papelera" o undo).
- Edición masiva o eliminación de múltiples gastos a la vez.
- Comentarios o adjuntos a gastos (fotos de recibos).
