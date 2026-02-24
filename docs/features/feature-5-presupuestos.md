# Feature Specification: Presupuestos por Categoría

**Status**: Draft
**Priority**: P1
**PRD Reference**: Section 4 — Feature 5
**Author**: Equipo GastoLog
**Last Updated**: 2026-02-24

## Overview

Sistema de presupuestos mensuales por categoría que permite al usuario definir un monto objetivo de gasto para cada categoría en un mes calendario específico. La app calcula automáticamente el consumido del mes, el porcentaje de avance y si se ha excedido el objetivo. El usuario puede desactivar presupuestos sin eliminarlos para conservar el historial. Este feature corresponde a la Fase 2 del plan de desarrollo, pero su modelo de datos se diseña desde el inicio para no requerir migraciones.

## User Stories

1. Como usuario, quiero definir un monto máximo de gasto mensual por categoría para tener un objetivo concreto que guíe mis decisiones diarias.
2. Como usuario, quiero ver cuánto he gastado vs. mi objetivo en cada categoría del mes actual para saber si voy por buen camino.
3. Como usuario, quiero ver claramente qué presupuestos he excedido para tomar acción correctiva antes de que termine el mes.
4. Como usuario, quiero navegar entre meses para comparar mis presupuestos y consumos históricos.
5. Como usuario, quiero desactivar un presupuesto que ya no necesito sin perder el registro de meses anteriores.
6. Como usuario, quiero crear o editar presupuestos de forma rápida sin tener que configurar muchos campos.

## Acceptance Criteria

- [ ] AC1: El usuario puede crear un presupuesto definiendo **categoría** y **monto objetivo en COP** para un **mes calendario** (ej. "Febrero 2026").
- [ ] AC2: El sistema calcula automáticamente el **monto consumido** del mes sumando todos los gastos activos (no eliminados) de la categoría en ese mes.
- [ ] AC3: El sistema calcula el **porcentaje de consumo** = `(monto_consumido / monto_objetivo) * 100`, redondeado a un decimal.
- [ ] AC4: Cuando `monto_consumido > monto_objetivo`, el presupuesto se marca como **excedido** en la lógica de datos.
- [ ] AC5: El usuario puede cambiar el **mes** visualizado en la pantalla de presupuestos y ver los presupuestos y consumos de ese mes.
- [ ] AC6: El usuario puede **editar** el monto objetivo de un presupuesto existente. El cambio se refleja inmediatamente en el porcentaje calculado.
- [ ] AC7: El usuario puede **desactivar** un presupuesto (`activo = false`). El presupuesto desaparecerá de la vista principal pero se puede consultar en el historial de presupuestos.
- [ ] AC8: El usuario **no puede crear dos presupuestos activos para la misma categoría en el mismo mes**.
- [ ] AC9: Los cálculos de consumo usan la **zona horaria del usuario** para determinar qué gastos pertenecen al mes calendario.
- [ ] AC10: Los presupuestos se persisten offline en IndexedDB y se sincronizan con Supabase al recuperar conexión.
- [ ] AC11: Si una categoría asociada a un presupuesto se desactiva, el presupuesto permanece y sigue calculando el consumo histórico correctamente.

## Technical Design

### Architecture

Los presupuestos son una entidad de lectura/escritura independiente que se combina con los gastos para calcular el consumo. Los cálculos son del lado del cliente sobre datos de IndexedDB, siguiendo el mismo patrón del dashboard. No se almacena `monto_consumido` en base de datos; siempre se calcula en tiempo real.

```
┌──────────────────────────────────────────────────────────────┐
│  /app/presupuestos (React Page)                              │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  SelectorMes  ← / mes actual / →                      │  │
│  └───────────────────────┬────────────────────────────────┘  │
│                          ▼                                   │
│          ┌───────────────────────────────┐                   │
│          │  usePresupuestos(mes)         │                   │
│          └───────────────┬───────────────┘                   │
│                          │                                   │
│          ┌───────────────▼───────────────┐                   │
│          │  PresupuestoService           │                   │
│          │  .calcularConsumos(mes)       │                   │
│          └───────┬───────────┬───────────┘                   │
│                  │           │                               │
│     IndexedDB    │           │  IndexedDB                    │
│    (presupuestos)│           │  (gastos del mes)             │
│                  └─────┬─────┘                               │
│                        ▼                                     │
│          ┌─────────────────────────────┐                     │
│          │  PresupuestoConConsumo[]     │                     │
│          └──────────────┬──────────────┘                     │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  ListaPresupuestos                                   │    │
│  │  ┌────────────────────────────────────────────────┐  │    │
│  │  │  ItemPresupuesto × N (barra progreso + estado) │  │    │
│  │  └────────────────────────────────────────────────┘  │    │
│  └──────────────────────────────────────────────────────┘    │
│                         │                                    │
│                SyncEngine → Supabase                         │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  /app/presupuestos/[id]  (Crear / Editar)                    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  FormularioPresupuesto                               │    │
│  │  (SelectorCategoria + InputMonto + SelectorMes)      │    │
│  └──────────────────────┬───────────────────────────────┘    │
│                         ▼                                    │
│          PresupuestoService.crear() / .editar()              │
│                         ▼                                    │
│                IndexedDB → SyncEngine → Supabase             │
└──────────────────────────────────────────────────────────────┘
```

**Decisiones de diseño:**
- `monto_consumido`, `porcentaje_consumo` y `excedido` son **campos calculados** (nunca persistidos). Se computan en `PresupuestoService.calcularConsumos()` combinando la tabla de presupuestos con los gastos del mes en IndexedDB.
- El mes se representa como string `"YYYY-MM"` (ej. `"2026-02"`) tanto en la entidad como en la URL.
- La pantalla de presupuestos muestra por defecto el **mes actual** y permite navegar mes a mes con botones anterior/siguiente.

### Data Models

```typescript
// Entidad persistida: Presupuesto
interface Presupuesto {
  id: string;                    // UUID v4, generado en cliente
  usuario_id: string;            // UUID de Supabase Auth
  categoria_id: string;          // UUID de la categoría
  mes: string;                   // "YYYY-MM", ej. "2026-02"
  monto_objetivo_cop: number;    // Entero positivo en COP
  activo: boolean;               // false = desactivado (oculto en vista principal)
  creado_en: string;             // ISO 8601 timestamp
  actualizado_en: string;        // ISO 8601 timestamp
}

// Modelo calculado (runtime, nunca persistido)
interface PresupuestoConConsumo extends Presupuesto {
  categoria_nombre: string;
  categoria_color: string | null;
  monto_consumido_cop: number;   // Suma de gastos activos de la categoría en el mes
  porcentaje_consumo: number;    // (consumido / objetivo) * 100, redondeado 1 decimal
  excedido: boolean;             // consumido > objetivo
}

// Payload para crear
interface CrearPresupuestoInput {
  categoria_id: string;
  mes: string;                   // "YYYY-MM"
  monto_objetivo_cop: number;
}

// Payload para editar
interface EditarPresupuestoInput {
  id: string;
  monto_objetivo_cop?: number;
  activo?: boolean;
}

// Operación de sync
type TipoOperacionPresupuesto = "CREATE_PRESUPUESTO" | "UPDATE_PRESUPUESTO";

interface OperacionSyncPresupuesto {
  id_operacion: string;
  tipo: TipoOperacionPresupuesto;
  payload: Presupuesto;
  creada_en: string;
  intentos: number;              // Máx 3
  estado: "Pendiente" | "Sincronizando" | "Sincronizado" | "Error";
}
```

### Database Schema (Supabase/Postgres)

```sql
CREATE TABLE presupuestos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  categoria_id UUID NOT NULL REFERENCES categorias(id),
  mes TEXT NOT NULL CHECK (mes ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  monto_objetivo_cop INTEGER NOT NULL CHECK (monto_objetivo_cop > 0),
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Un solo presupuesto activo por categoría por mes por usuario
  CONSTRAINT uq_presupuesto_activo
    UNIQUE (usuario_id, categoria_id, mes)
);

-- RLS: cada usuario solo ve sus presupuestos
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios ven sus presupuestos"
  ON presupuestos FOR ALL
  USING (auth.uid() = usuario_id);

-- Índices
CREATE INDEX idx_presupuestos_usuario_mes ON presupuestos (usuario_id, mes);
CREATE INDEX idx_presupuestos_usuario_categoria ON presupuestos (usuario_id, categoria_id);
```

> **Nota sobre unicidad:** El constraint `UNIQUE (usuario_id, categoria_id, mes)` garantiza en base de datos que no existan dos presupuestos para la misma categoría en el mismo mes, independientemente del valor de `activo`. La validación de AC8 se aplica primero en cliente (IndexedDB) y el constraint actúa como red de seguridad en Supabase.

### Calculation Logic

```typescript
// src/services/presupuesto-service.ts

class PresupuestoService {

  /**
   * Retorna los presupuestos del mes con sus consumos calculados.
   * Solo presupuestos activos por defecto; pasar incluirInactivos para historial.
   */
  async calcularConsumos(
    mes: string,
    opciones?: { incluirInactivos?: boolean }
  ): Promise<PresupuestoConConsumo[]>;

  /**
   * Crea un presupuesto: valida unicidad de (categoria_id, mes),
   * escribe en IndexedDB y encola CREATE_PRESUPUESTO.
   */
  async crear(input: CrearPresupuestoInput, usuarioId: string): Promise<Presupuesto>;

  /**
   * Edita monto_objetivo o activo de un presupuesto.
   * Escribe en IndexedDB y encola UPDATE_PRESUPUESTO.
   */
  async editar(input: EditarPresupuestoInput): Promise<Presupuesto>;

  /**
   * Verifica si ya existe un presupuesto para (usuario_id, categoria_id, mes).
   * Usado para validación de unicidad antes de crear.
   */
  async existeParaMesCategoria(
    categoriaId: string,
    mes: string
  ): Promise<boolean>;
}
```

**Lógica de cálculo de consumo por presupuesto:**

```typescript
// Pseudocódigo del cálculo dentro de calcularConsumos()

function calcularConsumo(presupuesto: Presupuesto, gastos: Gasto[]): PresupuestoConConsumo {
  // 1. Filtrar gastos de la categoría del presupuesto en el mes
  const gastosDelMes = gastos.filter(g =>
    g.categoria_id === presupuesto.categoria_id &&
    g.eliminado_en === null &&
    toYYYYMM(g.fecha_hora, zona_horaria) === presupuesto.mes
  );

  // 2. Sumar montos
  const consumido = gastosDelMes.reduce((acc, g) => acc + g.monto_cop, 0);

  // 3. Calcular porcentaje y excedido
  const porcentaje = round((consumido / presupuesto.monto_objetivo_cop) * 100, 1);
  const excedido = consumido > presupuesto.monto_objetivo_cop;

  return { ...presupuesto, monto_consumido_cop: consumido, porcentaje_consumo: porcentaje, excedido };
}
```

### API / Service Layer

```typescript
// src/hooks/usePresupuestos.ts

function usePresupuestos(mes: string): {
  presupuestos: PresupuestoConConsumo[];   // Solo activos
  cargando: boolean;
  error: string | null;
};

// src/hooks/useGestionPresupuestos.ts

function useGestionPresupuestos(): {
  crear: (input: CrearPresupuestoInput) => Promise<void>;
  editar: (input: EditarPresupuestoInput) => Promise<void>;
  desactivar: (id: string) => Promise<void>;
  guardando: boolean;
  error: string | null;
};
```

### Components

| Componente | Responsabilidad |
|---|---|
| `PaginaPresupuestos` | Page en `/app/presupuestos/page.tsx`. Gestiona el mes seleccionado (default: mes actual). |
| `SelectorMes` | Navegación mes a mes con botones `←` / `→` y texto del mes (ej. "Febrero 2026"). No permite navegar más allá del mes actual hacia adelante. |
| `ListaPresupuestos` | Renderiza `ItemPresupuesto × N`. Separación visual entre presupuestos normales y excedidos. |
| `ItemPresupuesto` | Muestra: nombre de categoría (chip de color), monto consumido vs objetivo, barra de progreso y porcentaje. Badge rojo si `excedido`. Toque → navega a edición. |
| `BarraProgreso` | Barra visual proporcional. Colores: verde (< 80%), amarillo (80–100%), rojo (> 100%). El overflow se representa visualmente hasta el borde. |
| `PaginaFormPresupuesto` | Page en `/app/presupuestos/[id]/page.tsx`. Modo crear (`id = "nuevo"`) o editar (UUID). |
| `FormularioPresupuesto` | `SelectorCategoria` (filtra categorías sin presupuesto activo en el mes) + `InputMonto` + `SelectorMes` + toggle `activo`. |
| `SelectorMesForm` | Select/picker de mes para el formulario. Rango: mes actual hasta 12 meses atrás. |
| `EstadoVacioPresupuestos` | "No tienes presupuestos para este mes" + botón "Crear presupuesto". |

### URL Structure

| Ruta | Propósito |
|---|---|
| `/app/presupuestos` | Lista de presupuestos del mes actual |
| `/app/presupuestos?mes=2026-01` | Lista de presupuestos de un mes específico |
| `/app/presupuestos/nuevo` | Formulario de creación |
| `/app/presupuestos/nuevo?mes=2026-01` | Formulario de creación preseleccionando el mes |
| `/app/presupuestos/{uuid}` | Formulario de edición del presupuesto con ese ID |

### Validation Rules

| Campo | Regla | Mensaje de error |
|---|---|---|
| `categoria_id` | Obligatorio | "Selecciona una categoría" |
| `categoria_id` + `mes` | No debe existir ya un presupuesto para esa combinación | "Ya tienes un presupuesto para esta categoría en este mes" |
| `monto_objetivo_cop` | Obligatorio, entero > 0 | "Ingresa un monto objetivo válido mayor a $0" |
| `mes` | Obligatorio, formato `YYYY-MM`, no puede ser mes futuro | "Selecciona un mes válido" |

## UI/UX Considerations

- **Progreso visual con umbrales de color**: la `BarraProgreso` usa verde hasta el 80% del objetivo, amarillo entre 80–100%, y rojo al superar el 100%. Esto proporciona un semáforo visual inmediato sin leer los números.
- **Presupuestos excedidos al tope de la lista**: los presupuestos con `excedido = true` se muestran al inicio de la lista (o en sección separada) para darles visibilidad prioritaria.
- **SelectorCategoria filtrado en el formulario**: al crear un nuevo presupuesto, el selector de categorías excluye las que ya tienen presupuesto activo en el mes seleccionado, para evitar duplicados antes de llegar a la validación.
- **Mes por defecto en formulario**: al llegar desde la lista de presupuestos, el formulario de creación hereda el mes actualmente visualizado.
- **Navegación entre meses no destructiva**: cambiar el mes en la lista nunca modifica ni elimina presupuestos; es solo una consulta histórica.

## Dependencies

- **Feature 2 (Categorización)**: necesita nombre, color y estado activo de cada categoría para mostrar en la lista y en el formulario.
- **Feature 1 y 4 (Registro e Historial)**: los gastos son la fuente de datos para el cálculo de `monto_consumido`. Cada nuevo gasto o edición puede cambiar el consumo de un presupuesto.
- **Feature 7 (Offline/Sync)**: crear y editar presupuestos encolan `CREATE_PRESUPUESTO` / `UPDATE_PRESUPUESTO` en IndexedDB para sync.
- **Feature 8 (Configuración)**: necesita `zona_horaria` para determinar a qué mes calendario pertenece cada gasto al calcular el consumo.

## Edge Cases

| Caso | Comportamiento esperado |
|---|---|
| Crear dos presupuestos para la misma categoría y mes | Bloqueado en cliente con error inline. El constraint de Supabase actúa como red de seguridad. |
| Editar el monto objetivo a un valor menor al consumido actual | Permitido. El presupuesto quedará inmediatamente en estado "excedido". No se muestra advertencia bloqueante, solo el estado visual de excedido. |
| Categoría desactivada con presupuesto activo | El presupuesto sigue calculando consumo correctamente. En la lista, el chip de categoría muestra el nombre con una marca de "inactiva" para informar al usuario. |
| Mes sin gastos para una categoría con presupuesto | `monto_consumido = 0`, `porcentaje = 0%`, barra vacía. No es un error. |
| Gasto registrado en una zona horaria diferente a la del presupuesto | El mes del gasto se evalúa usando `zona_horaria` del usuario, igual que en el dashboard, para consistencia. |
| Presupuesto desactivado en mes con gastos | Los gastos siguen existiendo; el presupuesto desactivado no aparece en la vista principal pero es consultable en historial. |
| Navegar a un mes muy antiguo (sin presupuestos ni gastos) | Mostrar estado vacío del mes seleccionado, sin error. |
| Monto objetivo muy bajo (ej. $1) | Permitido. El usuario decide sus propios umbrales. |
| Offline al crear presupuesto | Guardar en IndexedDB como Pendiente. Disponible para visualización inmediata. Si al reconectar el presupuesto ya existe en el servidor (conflicto), aplicar last-write-wins por `actualizado_en`. |

## Testing Strategy

### Unit Tests
- `calcularConsumos()` suma correctamente los gastos de la categoría para el mes dado.
- `calcularConsumos()` excluye gastos con `eliminado_en != null`.
- `calcularConsumos()` respeta la zona horaria del usuario al asignar gastos al mes.
- `calcularConsumos()` marca `excedido = true` cuando `consumido > objetivo`.
- `calcularConsumos()` calcula `porcentaje_consumo` con redondeo a 1 decimal.
- `existeParaMesCategoria()` detecta correctamente duplicados.
- Validación de formato `mes` (`"YYYY-MM"`).

### Integration Tests
- Crear presupuesto → aparece en `usePresupuestos(mes)` con consumo = 0.
- Registrar gasto en categoría con presupuesto → `monto_consumido` se actualiza al recalcular.
- Editar monto objetivo → `porcentaje_consumo` recalcula.
- Desactivar presupuesto → desaparece de `usePresupuestos()` (solo activos).
- Intentar crear duplicado → error de validación, no se crea.
- Sync: operación `CREATE_PRESUPUESTO` se envía a Supabase y se marca como sincronizada.
- RLS: usuario B no puede leer presupuestos de usuario A.

### E2E Tests
- Flujo completo: crear presupuesto "Alimentación / $200.000 / Feb 2026" → registrar 3 gastos de Alimentación → ver barra de progreso actualizada.
- Flujo excedido: registrar gastos que superan el objetivo → ver presupuesto marcado como excedido con barra roja.
- Flujo navegación de meses: crear presupuesto en enero → ir a febrero → lista vacía → volver a enero → presupuesto visible.
- Flujo desactivar: desactivar presupuesto → desaparece de la lista → los gastos históricos no se alteran.
- Flujo offline: desconectar → crear presupuesto → reconectar → verificar sync con Supabase.

## Performance Requirements

- **Carga de presupuestos del mes**: < 200ms desde IndexedDB (incluye cálculo de consumos).
- **Recálculo al cambiar de mes**: < 100ms.
- **Actualización de consumo tras nuevo gasto**: el hook `usePresupuestos` debe refrescarse en < 200ms tras una escritura en IndexedDB de un nuevo gasto (mismo patrón reactivo que el dashboard).
- **Cantidad esperada**: máx ~20 presupuestos activos por mes (uno por categoría). No requiere paginación.

## Out of Scope

- Presupuestos por semana o por periodo personalizado (solo mensual en MVP).
- Notificaciones o alertas cuando se acerca al límite del presupuesto.
- Presupuesto global (sin categoría) o presupuesto total del mes.
- Copia automática de presupuestos del mes anterior al mes nuevo.
- Gráfico de evolución del consumo a lo largo del mes (tendencia diaria dentro del presupuesto).
- Comparativa de consumo entre meses para el mismo presupuesto.
- Presupuestos compartidos entre usuarios.
