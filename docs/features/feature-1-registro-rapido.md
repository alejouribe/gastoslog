# Feature Specification: Registro Rápido de Gasto

**Status**: Draft
**Priority**: P0
**PRD Reference**: Section 4 — Feature 1
**Author**: Equipo GastoLog
**Last Updated**: 2026-02-24

## Overview

Flujo principal de la aplicación que permite al usuario registrar un gasto cotidiano en menos de 15 segundos. El formulario captura monto (COP), categoría, método de pago y nota opcional, persiste el registro de forma inmediata en IndexedDB (offline-first) y lo sincroniza con Supabase al recuperar conexión. El gasto aparece en historial y dashboard al instante, sin esperar red.

## User Stories

1. Como profesional en movimiento, quiero registrar un gasto en segundos para no olvidarlo y mantener mi historial completo.
2. Como usuario sin conexión, quiero que mi gasto se guarde localmente y se sincronice después para no perder información por falta de red.
3. Como usuario que olvidó registrar un gasto, quiero poder ajustar la fecha/hora (hasta 30 días atrás) para mantener mi historial preciso.
4. Como usuario que alterna efectivo y tarjeta, quiero indicar el método de pago para diferenciar mis gastos por canal.
5. Como usuario frecuente, quiero que el formulario recuerde la última categoría usada para reducir aún más el tiempo de registro.

## Acceptance Criteria

- [ ] AC1: El usuario puede crear un gasto ingresando **monto** (COP, entero, obligatorio) y seleccionando **categoría** (obligatoria) en un único formulario.
- [ ] AC2: La **fecha/hora** se asigna automáticamente al momento de guardado. El usuario puede editarla hasta un máximo de 30 días atrás.
- [ ] AC3: El campo **método de pago** es obligatorio con opciones: Efectivo, Tarjeta, Transferencia, Otro. Valor por defecto: Efectivo.
- [ ] AC4: El campo **nota** es opcional con un máximo de 140 caracteres.
- [ ] AC5: Al guardar sin conexión, el gasto se almacena en IndexedDB con `estado_sync = "Pendiente"` y aparece inmediatamente en historial y dashboard.
- [ ] AC6: Al guardar con conexión, el gasto se envía a Supabase y se marca como `estado_sync = "Sincronizado"`.
- [ ] AC7: El tiempo promedio de registro (desde abrir formulario hasta guardar) es inferior a 15 segundos en pruebas internas.
- [ ] AC8: El formulario valida que el monto sea mayor a 0 y muestre errores inline claros si faltan campos obligatorios.
- [ ] AC9: Tras guardar exitosamente, el formulario se limpia y muestra confirmación visual transitoria (toast/feedback).
- [ ] AC10: El formulario recuerda la última categoría seleccionada por el usuario entre sesiones (localStorage).

## Technical Design

### Architecture

El feature se implementa como una ruta protegida dentro del área autenticada de la PWA. Sigue el patrón offline-first: toda escritura va primero a IndexedDB y luego el Sync Engine la envía a Supabase cuando hay conexión.

```
┌─────────────────────────────────────────────────┐
│  /app/registrar (React Page)                    │
│  ┌───────────────┐    ┌──────────────────────┐  │
│  │ FormularioGasto│───▶│ useCrearGasto (hook) │  │
│  └───────────────┘    └──────────┬───────────┘  │
│                                  │              │
│                      ┌───────────▼───────────┐  │
│                      │   GastoService        │  │
│                      │  (write to IndexedDB) │  │
│                      └───────────┬───────────┘  │
│                                  │              │
│                      ┌───────────▼───────────┐  │
│                      │   SyncEngine          │  │
│                      │  (push to Supabase)   │  │
│                      └───────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Flujo de datos:**
1. El usuario completa el formulario y presiona Guardar.
2. El hook `useCrearGasto` valida los campos y construye el objeto `Gasto`.
3. `GastoService.crear()` genera un `id` local (UUID v4), asigna `estado_sync = "Pendiente"` y escribe en IndexedDB.
4. El estado local del historial y dashboard se actualiza inmediatamente (optimistic update).
5. `SyncEngine` detecta la operación pendiente y, si hay conexión, la envía a Supabase vía REST. Si tiene éxito, actualiza `estado_sync = "Sincronizado"`. Si falla, queda en cola para reintento.

### Data Models

```typescript
// Entidad principal: Gasto
interface Gasto {
  id: string;                // UUID v4, generado en cliente
  usuario_id: string;        // UUID de Supabase Auth
  categoria_id: string;      // UUID de la categoría seleccionada
  monto_cop: number;         // Entero positivo, sin decimales
  fecha_hora: string;        // ISO 8601 timestamp
  metodo_de_pago: MetodoDePago;
  nota: string | null;       // Máx 140 caracteres
  estado_sync: EstadoSync;
  creado_en: string;         // ISO 8601 timestamp
  actualizado_en: string;    // ISO 8601 timestamp
  eliminado_en: string | null;
}

type MetodoDePago = "Efectivo" | "Tarjeta" | "Transferencia" | "Otro";

type EstadoSync = "Sincronizado" | "Pendiente" | "Error";

// Payload del formulario (lo que el usuario ingresa)
interface CrearGastoInput {
  monto_cop: number;
  categoria_id: string;
  metodo_de_pago: MetodoDePago;
  nota?: string;
  fecha_hora?: string;       // Si no se provee, se usa Date.now()
}

// Operación en cola de sincronización (IndexedDB)
interface OperacionSync {
  id_operacion: string;      // UUID
  tipo: "CREATE_GASTO";
  payload: Gasto;
  creada_en: string;
  intentos: number;          // Máx 3
  estado: "Pendiente" | "Sincronizando" | "Sincronizado" | "Error";
}
```

### Database Schema (Supabase/Postgres)

```sql
CREATE TABLE gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  categoria_id UUID NOT NULL REFERENCES categorias(id),
  monto_cop INTEGER NOT NULL CHECK (monto_cop > 0),
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
  metodo_de_pago TEXT NOT NULL CHECK (metodo_de_pago IN ('Efectivo', 'Tarjeta', 'Transferencia', 'Otro')),
  nota TEXT CHECK (char_length(nota) <= 140),
  estado_sync TEXT NOT NULL DEFAULT 'Sincronizado',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  eliminado_en TIMESTAMPTZ
);

-- RLS: cada usuario solo ve sus gastos
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios ven sus gastos"
  ON gastos FOR ALL
  USING (auth.uid() = usuario_id);

-- Índices para rendimiento
CREATE INDEX idx_gastos_usuario_fecha ON gastos (usuario_id, fecha_hora DESC);
CREATE INDEX idx_gastos_usuario_categoria ON gastos (usuario_id, categoria_id);
```

### API / Service Layer

```typescript
// src/services/gasto-service.ts

class GastoService {
  /**
   * Crea un gasto: escribe en IndexedDB y encola sync.
   * Retorna el gasto con id local asignado.
   */
  async crear(input: CrearGastoInput, usuarioId: string): Promise<Gasto>;

  /**
   * Obtiene gastos desde IndexedDB (incluye pendientes).
   */
  async listar(filtros: FiltrosGasto): Promise<Gasto[]>;
}

// src/hooks/useCrearGasto.ts

function useCrearGasto(): {
  crear: (input: CrearGastoInput) => Promise<void>;
  guardando: boolean;
  error: string | null;
};
```

### Components

| Componente | Responsabilidad |
|---|---|
| `PaginaRegistrar` | Page component en `/app/registrar/page.tsx`. Layout y coordinación. |
| `FormularioGasto` | Formulario controlado: monto, categoría, método de pago, nota, fecha/hora. |
| `InputMonto` | Input numérico formateado como COP (`$25.000`). Solo enteros positivos. |
| `SelectorCategoria` | Lista de categorías activas del usuario. Recuerda la última seleccionada. |
| `SelectorMetodoPago` | Grupo de botones/select: Efectivo, Tarjeta, Transferencia, Otro. |
| `InputNota` | Textarea con contador de caracteres (140 máx). |
| `SelectorFechaHora` | Muestra "Ahora" por defecto. Expandible para seleccionar fecha (máx 30 días atrás). |

### Validation Rules

| Campo | Regla | Mensaje de error |
|---|---|---|
| `monto_cop` | Obligatorio, entero > 0 | "Ingresa un monto válido mayor a $0" |
| `categoria_id` | Obligatorio, debe existir en categorías activas | "Selecciona una categoría" |
| `metodo_de_pago` | Obligatorio, valor del enum | "Selecciona un método de pago" |
| `nota` | Opcional, máx 140 caracteres | "La nota no puede superar 140 caracteres" |
| `fecha_hora` | Si se edita: no puede ser futura ni mayor a 30 días atrás | "La fecha debe estar dentro de los últimos 30 días" |

## UI/UX Considerations

- **Mobile-first**: formulario diseñado para una mano, con el botón Guardar accesible con el pulgar.
- **Teclado numérico**: el input de monto abre teclado numérico (`inputMode="numeric"`).
- **Feedback inmediato**: toast de confirmación tras guardar; indicador visual si se guardó offline (badge "Pendiente").
- **Categoría rápida**: chips/grid de categorías visibles sin scroll si son ≤9. Última categoría usada preseleccionada.
- **Formato COP**: el monto se muestra formateado con separador de miles (punto) mientras el usuario escribe.

## Dependencies

- **Feature 2 (Categorización)**: necesita categorías activas para el selector.
- **Feature 6 (Autenticación)**: necesita `usuario_id` del usuario autenticado.
- **Feature 7 (Offline/Sync)**: necesita IndexedDB y SyncEngine para persistencia y sincronización.
- **Feature 8 (Configuración)**: necesita zona horaria para asignar `fecha_hora` correctamente.

## Edge Cases

| Caso | Comportamiento esperado |
|---|---|
| Sin categorías activas | Mostrar mensaje "Crea una categoría primero" con link a `/app/categorias`. |
| Monto con decimales | Truncar/redondear a entero (COP no usa decimales en este contexto). |
| Doble tap en Guardar | Deshabilitar botón tras primer click; prevenir duplicados. |
| Offline + sesión expirada | Permitir registro si ya tenía sesión activa. El sync resolverá auth al reconectar. |
| IndexedDB lleno/no disponible | Mostrar error claro: "No se pudo guardar. Libera espacio o intenta con conexión." |
| Fecha futura ingresada | Rechazar con validación: "La fecha no puede ser futura." |
| Fecha > 30 días atrás | Rechazar: "Solo puedes registrar gastos de los últimos 30 días." |

## Testing Strategy

### Unit Tests
- Validación de `CrearGastoInput` (monto, categoría, fecha, nota).
- Generación correcta del objeto `Gasto` con defaults (id, fecha_hora, estado_sync).
- Formateo de monto COP (input/output).

### Integration Tests
- `GastoService.crear()` escribe correctamente en IndexedDB.
- Operación aparece en cola de sync tras crear offline.
- Sync envía a Supabase y actualiza `estado_sync`.
- RLS bloquea acceso a gastos de otro usuario.

### E2E Tests
- Flujo completo: abrir formulario → llenar → guardar → verificar en historial.
- Flujo offline: desconectar → guardar → reconectar → verificar sync.
- Validación: intentar guardar sin monto → ver error inline.

## Performance Requirements

- **Tiempo de guardado local**: < 100ms (IndexedDB write).
- **Tiempo de renderizado del formulario**: < 200ms (sin esperar red).
- **Objetivo de UX**: registro completo en < 15 segundos desde que el usuario abre la página.

## Out of Scope

- Registro por voz o cámara (OCR).
- Gastos recurrentes / programados.
- Multi-moneda.
- Import/export de datos.
- Adjuntar fotos de recibos.
