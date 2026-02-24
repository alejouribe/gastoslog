# Feature Specification: Dashboard con Métricas y Gráficos

**Status**: Draft
**Priority**: P0
**PRD Reference**: Section 4 — Feature 3
**Author**: Equipo GastoLog
**Last Updated**: 2026-02-24

## Overview

Pantalla principal de consulta que muestra al usuario un resumen visual de sus gastos para el periodo seleccionado (Hoy, Semana, Mes). Incluye el total gastado, la distribución por categoría y una serie temporal de gasto por día. Los datos se calculan localmente desde IndexedDB (incluyendo gastos pendientes de sync) y se enriquecen con datos remotos cuando hay conexión. El dashboard es el punto de entrada tras el login y el espacio donde el usuario valida que su registro del día está en orden.

## User Stories

1. Como usuario, quiero ver el total gastado en el periodo actual al abrir la app para tener conciencia inmediata de mis gastos del día/semana/mes.
2. Como usuario, quiero ver en qué categorías gasto más (top categorías con porcentaje) para identificar patrones de consumo sin analizar cada registro.
3. Como usuario, quiero ver una gráfica de gasto por día para detectar qué días de la semana o del mes gasto más.
4. Como usuario, quiero cambiar el periodo (Hoy / Semana / Mes) y que los gráficos se recalculen al instante para comparar periodos sin fricción.
5. Como usuario offline, quiero que el dashboard siga siendo útil con mis datos locales para no perder visibilidad por falta de red.
6. Como usuario, quiero poder tocar una categoría en el dashboard para ver el historial filtrado por esa categoría y entender el detalle.

## Acceptance Criteria

- [ ] AC1: El dashboard muestra el **total gastado en COP** del periodo seleccionado, formateado con separador de miles (ej. `$142.500`).
- [ ] AC2: El usuario puede cambiar el periodo entre **Hoy**, **Semana** y **Mes**; los cálculos y gráficos se actualizan de forma inmediata.
- [ ] AC3: Se muestra la distribución por categoría: **top categorías** con nombre, monto total y porcentaje del periodo (ordenadas de mayor a menor gasto).
- [ ] AC4: Se muestra una **serie temporal** de gasto por día: los últimos 7 días si el periodo es Hoy/Semana, o los últimos 30 días si el periodo es Mes.
- [ ] AC5: Los cálculos **incluyen gastos con `estado_sync = "Pendiente"`**. Cuando hay pendientes en el periodo, se muestra un indicador textual "Incluye gastos pendientes de sync".
- [ ] AC6: Los cálculos **excluyen gastos con `eliminado_en` != null** (soft delete).
- [ ] AC7: Al tocar una categoría en la distribución, el usuario navega a `/app/historial` filtrado por esa categoría y el periodo activo.
- [ ] AC8: El dashboard es funcional **offline**: consume datos de IndexedDB sin requerir conexión.
- [ ] AC9: El periodo **Semana** usa lunes como inicio de semana (según `PreferenciasUsuario.semana_inicia_en`).
- [ ] AC10: Los rangos de fecha usan la **zona horaria del usuario** (`PreferenciasUsuario.zona_horaria`) para evitar cortes de día incorrectos.
- [ ] AC11: Si no hay gastos en el periodo seleccionado, se muestra un estado vacío con CTA para ir a Registrar.

## Technical Design

### Architecture

El dashboard consume datos directamente desde IndexedDB a través de un hook de agregación. No hace llamadas directas a Supabase en render; los datos remotos llegan vía SyncEngine que mantiene IndexedDB actualizado. Los cálculos de agregación se ejecutan en cliente sobre el conjunto de gastos del periodo.

```
┌──────────────────────────────────────────────────────────────┐
│  /app/dashboard (React Page)                                 │
│                                                              │
│  ┌────────────────┐   ┌─────────────────┐  ┌─────────────┐  │
│  │ SelectorPeriodo│   │ TotalPeriodo    │  │ BadgeSync   │  │
│  └───────┬────────┘   └────────┬────────┘  └──────┬──────┘  │
│          │                     │                  │         │
│          └─────────────┬───────┘                  │         │
│                        ▼                          │         │
│          ┌─────────────────────────┐              │         │
│          │  useDashboard(periodo)  │◄─────────────┘         │
│          └──────────┬──────────────┘                        │
│                     │                                        │
│          ┌──────────▼──────────────┐                        │
│          │  DashboardService       │                        │
│          │  calcularAgregados()    │                        │
│          └──────────┬──────────────┘                        │
│                     │                                        │
│          ┌──────────▼──────────────┐                        │
│          │  IndexedDB              │◄── SyncEngine           │
│          │  (gastos + categorías)  │         │               │
│          └─────────────────────────┘         ▼               │
│                                          Supabase            │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────────────┐  │
│  │ GraficoCategoria     │  │ GraficoSerieTemporal         │  │
│  │ (Recharts PieChart / │  │ (Recharts BarChart/LineChart) │  │
│  │  BarChart horizontal)│  └──────────────────────────────┘  │
│  └──────────────────────┘                                    │
└──────────────────────────────────────────────────────────────┘
```

**Decisiones de diseño:**
- Los cálculos son **síncronos sobre datos en memoria** (cargados desde IndexedDB una vez por cambio de periodo). No hay queries incrementales en render.
- El componente `useDashboard` se suscribe a cambios en IndexedDB (vía evento custom o store reactivo) para refrescar automáticamente cuando llega un nuevo gasto o se completa un sync.
- Recharts es la librería de gráficos definida en el stack del PRD; se usa `ResponsiveContainer` para adaptar al ancho mobile.

### Data Models

```typescript
// Input del hook
type Periodo = "Hoy" | "Semana" | "Mes";

interface RangoPeriodo {
  desde: Date;   // Inicio del periodo (00:00:00 en zona horaria del usuario)
  hasta: Date;   // Fin del periodo (23:59:59 del último día)
}

// Resultado de los cálculos de agregación
interface AgregadosDashboard {
  periodo: Periodo;
  rango: RangoPeriodo;
  total_periodo_cop: number;
  gasto_por_categoria: GastoCategoria[];
  gasto_por_dia: GastoDia[];
  tiene_pendientes: boolean;     // true si hay gastos con estado_sync = "Pendiente"
}

interface GastoCategoria {
  categoria_id: string;
  categoria_nombre: string;
  categoria_color: string | null;
  total_cop: number;
  porcentaje: number;            // 0–100, redondeado a 1 decimal
}

interface GastoDia {
  fecha: string;                 // "YYYY-MM-DD" en zona horaria del usuario
  total_cop: number;
}

// Preferencias necesarias para cálculos de periodo
interface PreferenciasCalculo {
  zona_horaria: string;          // IANA, ej. "America/Bogota"
  semana_inicia_en: "Lunes" | "Domingo";
}
```

### Calculation Logic

```typescript
// src/services/dashboard-service.ts

class DashboardService {
  /**
   * Calcula el rango de fechas para el periodo dado,
   * usando la zona horaria y configuración de inicio de semana del usuario.
   */
  calcularRango(periodo: Periodo, prefs: PreferenciasCalculo): RangoPeriodo;

  /**
   * Agrega gastos del rango dado desde el array de gastos locales.
   * - Excluye gastos con eliminado_en != null.
   * - Incluye gastos con estado_sync = "Pendiente" y activa tiene_pendientes.
   * - Calcula total, distribución por categoría y serie por día.
   */
  calcularAgregados(
    gastos: Gasto[],
    categorias: Categoria[],
    rango: RangoPeriodo,
    prefs: PreferenciasCalculo
  ): AgregadosDashboard;

  /**
   * Genera el array de días del rango con total = 0 para los días sin gastos,
   * garantizando que la serie temporal siempre muestre todos los días del periodo.
   */
  generarSerieDias(
    gastoPorDia: Record<string, number>,
    rango: RangoPeriodo,
    zona_horaria: string
  ): GastoDia[];
}
```

**Lógica de rangos por periodo:**

| Periodo | `desde` | `hasta` | Días en serie temporal |
|---|---|---|---|
| Hoy | 00:00:00 hoy | 23:59:59 hoy | Últimos 7 días (contexto de semana) |
| Semana | Lunes (o Domingo) de la semana actual | Hoy | Últimos 7 días |
| Mes | Día 1 del mes actual | Hoy | Cada día del mes hasta hoy |

### API / Service Layer

```typescript
// src/hooks/useDashboard.ts

function useDashboard(periodo: Periodo): {
  agregados: AgregadosDashboard | null;
  cargando: boolean;
  error: string | null;
};
```

El hook:
1. Lee `PreferenciasUsuario` desde IndexedDB.
2. Calcula `RangoPeriodo` con `DashboardService.calcularRango()`.
3. Carga todos los gastos del usuario desde IndexedDB.
4. Ejecuta `DashboardService.calcularAgregados()` en memoria.
5. Se re-ejecuta cuando cambia `periodo` o cuando IndexedDB emite un evento de escritura de gastos.

### Components

| Componente | Responsabilidad |
|---|---|
| `PaginaDashboard` | Page en `/app/dashboard/page.tsx`. Gestiona estado del periodo seleccionado. |
| `SelectorPeriodo` | Tabs o toggle: Hoy / Semana / Mes. Emite `onChange(periodo)`. |
| `TarjetaTotalPeriodo` | Muestra el monto total del periodo formateado en COP. Subtítulo con el rango de fechas. |
| `BadgePendientes` | Indicador "Incluye gastos pendientes de sync". Solo se renderiza si `tiene_pendientes = true`. |
| `SeccionCategoria` | Contiene el gráfico y la lista de categorías. Cada ítem es tocable para navegar al historial filtrado. |
| `GraficoCategoria` | `PieChart` o `BarChart` horizontal de Recharts. Colores basados en `categoria_color`. |
| `ListaTopCategorias` | Lista ordenada: nombre, barra de progreso proporcional, monto y porcentaje. |
| `GraficoSerieTemporal` | `BarChart` o `LineChart` de Recharts con eje X de fechas y eje Y de monto COP. |
| `EstadoVacioDashboard` | Ilustración + texto "Aún no tienes gastos este periodo" + botón "Registrar gasto". |

### Navigation

Desde el dashboard se puede navegar a:

| Acción | Destino |
|---|---|
| Tocar categoría en distribución | `/app/historial?categoria_id={id}&periodo={periodo}` |
| Botón / tab "Registrar" | `/app/registrar` |
| Estado vacío CTA | `/app/registrar` |

### Formatting Rules

| Dato | Formato |
|---|---|
| Montos COP | `$` + número con separador de miles (punto): `$142.500` |
| Porcentajes | Un decimal: `34.5%` |
| Fechas en eje X (serie diaria) | `DD/MM` para semana/mes; solo hora `HH:mm` para "Hoy" si se muestra por hora (fuera de scope MVP) |
| Rango en subtítulo | "Lun 17 – Dom 23 feb" (semana) / "Feb 2026" (mes) / "Hoy, lun 24 feb" |

## Dependencies

- **Feature 1 (Registro rápido)**: cada nuevo gasto dispara re-cálculo del dashboard.
- **Feature 2 (Categorización)**: necesita `nombre` y `color` de cada categoría para etiquetar la distribución.
- **Feature 4 (Historial)**: el dashboard navega al historial filtrado por categoría y periodo.
- **Feature 7 (Offline/Sync)**: los datos vienen de IndexedDB; el dashboard debe refrescarse al completar un sync.
- **Feature 8 (Configuración)**: necesita `zona_horaria` y `semana_inicia_en` para calcular rangos correctamente.

## Edge Cases

| Caso | Comportamiento esperado |
|---|---|
| Sin gastos en el periodo | Estado vacío con CTA para registrar. Total = `$0`. |
| Todos los gastos son pendientes | Mostrar datos normalmente con badge "Incluye gastos pendientes de sync". |
| Un día sin gastos en la serie temporal | Mostrar barra en 0 (no omitir el día) para que el eje X sea continuo. |
| Categoría eliminada (soft delete) del gasto | El gasto sigue sumando al total pero se agrupa como "Sin categoría" si `categoria_id` ya no existe. |
| Porcentajes que no suman 100% por redondeo | Aceptable; no ajustar artificialmente. El total en COP siempre es exacto. |
| Periodo "Hoy" sin zona horaria configurada | Usar `"America/Bogota"` como fallback (valor por defecto de `PreferenciasUsuario`). |
| Gasto con `fecha_hora` fuera del rango por diferencia de zona horaria | La fecha se convierte a la zona horaria del usuario antes de comparar. |
| Muchos gastos (>500 en el mes) | El cálculo en memoria sobre IndexedDB debe completarse en < 200ms. Usar índice por `usuario_id + fecha_hora`. |
| Cambio rápido de periodo (tap múltiple) | El hook cancela el cálculo anterior (debounce o cancelación de efecto) para mostrar solo el último periodo. |

## Testing Strategy

### Unit Tests
- `calcularRango("Hoy", prefs)` retorna el rango correcto para la zona horaria dada.
- `calcularRango("Semana", { semana_inicia_en: "Lunes" })` inicia en lunes.
- `calcularAgregados()` excluye gastos con `eliminado_en != null`.
- `calcularAgregados()` incluye gastos con `estado_sync = "Pendiente"` y activa `tiene_pendientes`.
- `calcularAgregados()` calcula porcentajes correctamente (suma de porcentajes ≈ 100%).
- `generarSerieDias()` incluye todos los días del rango con `total_cop = 0` para días sin gastos.
- Formateo de montos COP: `142500` → `$142.500`.

### Integration Tests
- `useDashboard("Mes")` retorna datos correctos tras cargar gastos desde IndexedDB.
- Al insertar un nuevo gasto en IndexedDB, el hook se re-ejecuta y el total se actualiza.
- Al cambiar periodo, el hook re-calcula sin usar datos del periodo anterior.
- Navegación: tocar categoría en dashboard lleva a historial con filtro correcto en la URL.

### E2E Tests
- Flujo completo: registrar 3 gastos de categorías distintas → ir al dashboard → verificar total y distribución.
- Flujo offline: desconectar → registrar gasto → verificar que dashboard actualiza y muestra badge de pendientes.
- Cambio de periodo: registrar gastos en días distintos → cambiar entre Hoy/Semana/Mes → verificar totales correctos.
- Flujo desde dashboard a historial filtrado: tocar categoría → verificar que historial solo muestra esa categoría.

## Performance Requirements

- **Carga inicial del dashboard**: < 300ms desde IndexedDB hasta render completo (incluye cálculos).
- **Cambio de periodo**: < 100ms para re-cálculo y re-render.
- **Re-render tras nuevo gasto**: < 150ms desde escritura en IndexedDB hasta actualización del total en pantalla.
- **Gráficos**: sin janks en animación de Recharts en mobile (60fps). Desactivar animaciones si el dataset > 100 puntos.

## Out of Scope

- Comparativa entre periodos (ej. "Este mes vs mes anterior").
- Proyección de gasto al final del mes.
- Notificaciones o alertas desde el dashboard.
- Exportar gráficos como imagen.
- Drill-down por día en la serie temporal (fuera del MVP).
- Filtro por método de pago en el dashboard.
- Gráficos de tipo línea acumulada o waterfall.
