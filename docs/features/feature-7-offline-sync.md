# Feature Specification: Offline-first + Sincronización Automática

**Status**: Draft
**Priority**: P0
**PRD Reference**: Section 4 — Feature 7
**Author**: Equipo GastoLog
**Last Updated**: 2026-02-24

## Overview

Infraestructura transversal que garantiza que el usuario pueda registrar, editar y eliminar gastos y categorías en cualquier momento, con o sin conexión a internet. Toda operación de escritura se persiste primero en IndexedDB como una operación en cola. Al recuperar conexión, el SyncEngine procesa la cola en orden, envía las operaciones a Supabase y actualiza el estado de cada una. Los conflictos se resuelven con una política determinística last-write-wins basada en `actualizado_en`. El usuario puede monitorear el estado de la cola desde `/app/sync`.

Este feature no tiene UI propia para la captura de datos; es la capa de infraestructura que sostiene los Features 1, 2, 4 y 5.

## User Stories

1. Como usuario sin conexión, quiero registrar un gasto y que quede guardado localmente para no perder la información por falta de red.
2. Como usuario que recupera conexión, quiero que mis gastos pendientes se sincronicen automáticamente con el servidor sin tener que hacer nada.
3. Como usuario, quiero ver cuántas operaciones están pendientes de sync para saber si mis datos están completamente guardados en el servidor.
4. Como usuario con errores de sync, quiero poder reintentar la sincronización manualmente para resolver operaciones que fallaron.
5. Como usuario, quiero que la app resuelva conflictos de forma predecible si modifiqué un dato localmente y también fue modificado en el servidor.
6. Como usuario, quiero que los datos del historial y del dashboard se muestren de inmediato con mis datos locales, sin esperar que se complete la sync con el servidor.

## Acceptance Criteria

- [ ] AC1: Cuando no hay conexión, las operaciones CREATE/UPDATE (gastos, categorías) se guardan en IndexedDB en una **cola de sincronización** con `estado = "Pendiente"`.
- [ ] AC2: Al recuperar conexión, el SyncEngine **detecta automáticamente** la reconexión (via `navigator.onLine` + evento `online`) y procesa la cola en orden FIFO.
- [ ] AC3: Cada operación se intenta sincronizar con Supabase. Si tiene éxito, se marca como `"Sincronizado"`. Si falla, `intentos++` y queda en `"Pendiente"` para reintento.
- [ ] AC4: Tras **3 intentos fallidos**, la operación queda en estado `"Error"` y no se reintenta automáticamente.
- [ ] AC5: Las operaciones en error pueden **reintentarse manualmente** desde `/app/sync`, lo cual resetea `intentos = 0` y el estado a `"Pendiente"`.
- [ ] AC6: El usuario puede ver el **contador de operaciones pendientes** (dato expuesto en contexto; su visualización en UI pertenece a cada feature que lo consuma).
- [ ] AC7: En caso de **conflicto** (mismo registro modificado local y remotamente), el sistema aplica **last-write-wins** basado en `actualizado_en`: prevalece el registro con timestamp más reciente.
- [ ] AC8: Las **eliminaciones** (soft delete) prevalecen sobre actualizaciones previas al mismo registro: si localmente se marcó `eliminado_en` y en el servidor había una actualización más reciente, la eliminación prevalece.
- [ ] AC9: Los reintentos usan **backoff exponencial**: espera 2s antes del 2.° intento, 4s antes del 3.°.
- [ ] AC10: La cola de sync se almacena en **IndexedDB** (objeto `cola_sync`). No se pierde al cerrar la app ni al recargar la página.
- [ ] AC11: Las operaciones `CREATE_GASTO` pendientes que fueron eliminadas localmente antes de sincronizarse se **cancelan** de la cola (no se envían al servidor).
- [ ] AC12: El SyncEngine procesa **una operación a la vez** en orden FIFO para preservar la integridad causal (ej. no se puede actualizar un gasto que aún no se creó en el servidor).

## Technical Design

### Architecture

El SyncEngine es un módulo singleton que corre en el cliente (no en el Service Worker). Se activa al detectar conexión y al iniciar la app. Opera exclusivamente sobre IndexedDB y usa el cliente Supabase JS para las operaciones de red.

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENTE (Next.js PWA)                                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Features (Gastos, Categorías, Presupuestos)            │   │
│  │  Escriben en IndexedDB + encolan operación de sync      │   │
│  └───────────────────────────┬─────────────────────────────┘   │
│                              │ escribe en                      │
│  ┌───────────────────────────▼─────────────────────────────┐   │
│  │  IndexedDB                                              │   │
│  │  ┌──────────────────┐  ┌──────────────────────────────┐ │   │
│  │  │  Stores de datos │  │  cola_sync                   │ │   │
│  │  │  gastos          │  │  { id_operacion, tipo,       │ │   │
│  │  │  categorias      │  │    payload, intentos,        │ │   │
│  │  │  presupuestos    │  │    estado, creada_en }       │ │   │
│  │  │  preferencias    │  └──────────────┬───────────────┘ │   │
│  │  └──────────────────┘                │                  │   │
│  └──────────────────────────────────────┼──────────────────┘   │
│                                         │ lee / actualiza      │
│  ┌──────────────────────────────────────▼──────────────────┐   │
│  │  SyncEngine (singleton)                                 │   │
│  │                                                         │   │
│  │  - Escucha: navigator.onLine, evento "online"           │   │
│  │  - Escucha: nueva operación encolada (evento custom)    │   │
│  │  - procesarCola(): FIFO, una a la vez                   │   │
│  │  - enviarOperacion(): llama a Supabase                  │   │
│  │  - resolverConflicto(): last-write-wins por actualizado_en  │
│  │  - manejarError(): backoff + max intentos               │   │
│  └───────────────────────────┬─────────────────────────────┘   │
│                              │ REST/JS Client                  │
│  ┌───────────────────────────▼─────────────────────────────┐   │
│  │  Supabase (Auth + Postgres + RLS)                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Service Worker (Cache Storage)                         │   │
│  │  Solo cachea assets estáticos (JS, CSS, imágenes)       │   │
│  │  NO gestiona la cola de sync (eso es del SyncEngine)    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Separación de responsabilidades:**
- **Service Worker**: cachea assets estáticos para que la PWA cargue offline. No gestiona datos ni cola de sync.
- **SyncEngine**: módulo JS en el cliente principal. Gestiona toda la lógica de sincronización de datos con Supabase.
- Esta separación evita la complejidad del Background Sync API (soporte inconsistente en browsers) y mantiene la lógica de negocio en un solo lugar.

### IndexedDB Schema

```typescript
// Definición de stores de IndexedDB (usando idb o dexie)

interface DBSchema {
  // Store: datos de entidades
  gastos: {
    key: string;                  // id del gasto
    value: Gasto;
    indexes: {
      "by-usuario-fecha": [string, string];   // [usuario_id, fecha_hora]
      "by-usuario-categoria": [string, string]; // [usuario_id, categoria_id]
    };
  };
  categorias: {
    key: string;                  // id de la categoría
    value: Categoria;
    indexes: {
      "by-usuario": string;       // usuario_id
    };
  };
  presupuestos: {
    key: string;                  // id del presupuesto
    value: Presupuesto;
    indexes: {
      "by-usuario-mes": [string, string]; // [usuario_id, mes]
    };
  };
  preferencias_usuario: {
    key: string;                  // usuario_id
    value: PreferenciasUsuario;
  };

  // Store: cola de sincronización
  cola_sync: {
    key: string;                  // id_operacion
    value: OperacionSync;
    indexes: {
      "by-estado": string;        // estado (para filtrar pendientes/errores)
      "by-creada_en": string;     // creada_en (para orden FIFO)
    };
  };
}
```

### Data Models

```typescript
// Tipos de operación soportados por el SyncEngine
type TipoOperacion =
  | "CREATE_GASTO"
  | "UPDATE_GASTO"      // Incluye soft delete (actualiza eliminado_en)
  | "CREATE_CATEGORIA"
  | "UPDATE_CATEGORIA"
  | "CREATE_PRESUPUESTO"
  | "UPDATE_PRESUPUESTO";

type EstadoOperacion = "Pendiente" | "Sincronizando" | "Sincronizado" | "Error";

// Operación en la cola de sync
interface OperacionSync {
  id_operacion: string;           // UUID v4
  tipo: TipoOperacion;
  payload: Record<string, unknown>; // Snapshot completo de la entidad al momento de la operación
  entidad_id: string;             // ID de la entidad afectada (para resolución de conflictos)
  usuario_id: string;             // Para autenticación en sync
  creada_en: string;              // ISO 8601; ordena la cola FIFO
  intentos: number;               // 0, 1, 2, 3 (máx)
  ultimo_error: string | null;    // Mensaje del último error para mostrar en /app/sync
  estado: EstadoOperacion;
}

// Estado global del SyncEngine (expuesto via contexto)
interface EstadoSync {
  online: boolean;
  sincronizando: boolean;
  pendientes: number;             // Conteo de operaciones en estado "Pendiente"
  errores: number;                // Conteo de operaciones en estado "Error"
}

// Resultado de intentar enviar una operación
type ResultadoEnvio =
  | { exito: true }
  | { exito: false; error: string; esConflicto: boolean };
```

### SyncEngine — Processing Logic

```typescript
// src/services/sync-engine.ts  (pseudocódigo ilustrativo)

class SyncEngine {

  /** Inicia el engine: suscribe a eventos de red y procesa cola inicial. */
  iniciar(): void {
    window.addEventListener("online", () => this.procesarCola());
    // Evento custom emitido por GastoService, CategoriaService, etc.
    window.addEventListener("nueva-operacion-encolada", () => {
      if (navigator.onLine) this.procesarCola();
    });
    // Procesar pendientes al abrir la app si hay red
    if (navigator.onLine) this.procesarCola();
  }

  /** Procesa la cola FIFO. Una operación a la vez. */
  async procesarCola(): Promise<void> {
    if (this.procesando) return;        // Evitar ejecución concurrente
    this.procesando = true;

    try {
      const pendientes = await db.cola_sync
        .index("by-estado").getAll("Pendiente");
      const ordenadas = pendientes.sort(
        (a, b) => a.creada_en.localeCompare(b.creada_en) // FIFO
      );

      for (const op of ordenadas) {
        if (!navigator.onLine) break;   // Abortar si se pierde la red durante el proceso
        await this.procesarOperacion(op);
      }
    } finally {
      this.procesando = false;
      this.actualizarEstado();
    }
  }

  /** Procesa una operación individual con backoff y límite de intentos. */
  async procesarOperacion(op: OperacionSync): Promise<void> {
    // Cancelar si es CREATE y la entidad ya fue eliminada localmente
    if (op.tipo === "CREATE_GASTO") {
      const gasto = await db.gastos.get(op.entidad_id);
      if (gasto?.eliminado_en) {
        await db.cola_sync.delete(op.id_operacion);
        return;
      }
    }

    // Aplicar backoff antes del 2.° y 3.° intento
    if (op.intentos > 0) {
      await esperar(Math.pow(2, op.intentos) * 1000); // 2s, 4s
    }

    // Marcar como sincronizando
    await db.cola_sync.update(op.id_operacion, { estado: "Sincronizando" });

    const resultado = await this.enviarOperacion(op);

    if (resultado.exito) {
      await db.cola_sync.update(op.id_operacion, { estado: "Sincronizado" });
    } else {
      const nuevosIntentos = op.intentos + 1;
      if (nuevosIntentos >= 3) {
        await db.cola_sync.update(op.id_operacion, {
          estado: "Error",
          intentos: nuevosIntentos,
          ultimo_error: resultado.error,
        });
      } else {
        await db.cola_sync.update(op.id_operacion, {
          estado: "Pendiente",
          intentos: nuevosIntentos,
          ultimo_error: resultado.error,
        });
      }
    }
  }

  /** Envía una operación a Supabase y resuelve conflictos. */
  async enviarOperacion(op: OperacionSync): Promise<ResultadoEnvio> {
    try {
      switch (op.tipo) {
        case "CREATE_GASTO":
          await supabase.from("gastos").insert(op.payload);
          break;

        case "UPDATE_GASTO": {
          // Resolución de conflictos: obtener registro remoto
          const { data: remoto } = await supabase
            .from("gastos")
            .select("actualizado_en, eliminado_en")
            .eq("id", op.entidad_id)
            .single();

          if (remoto) {
            // Soft delete local prevalece siempre
            const payloadLocal = op.payload as Gasto;
            if (payloadLocal.eliminado_en) {
              await supabase.from("gastos")
                .update({ eliminado_en: payloadLocal.eliminado_en, actualizado_en: payloadLocal.actualizado_en })
                .eq("id", op.entidad_id);
            } else if (!remoto.eliminado_en &&
                       payloadLocal.actualizado_en > remoto.actualizado_en) {
              // Last-write-wins: solo actualizar si local es más reciente
              await supabase.from("gastos").update(op.payload).eq("id", op.entidad_id);
            }
            // Si remoto es más reciente y no está eliminado: descartar cambio local
          }
          break;
        }

        case "CREATE_CATEGORIA":
          await supabase.from("categorias").insert(op.payload);
          break;

        case "UPDATE_CATEGORIA": {
          const { data: remoto } = await supabase
            .from("categorias")
            .select("actualizado_en")
            .eq("id", op.entidad_id)
            .single();
          const payloadLocal = op.payload as Categoria;
          if (!remoto || payloadLocal.actualizado_en > remoto.actualizado_en) {
            await supabase.from("categorias").update(op.payload).eq("id", op.entidad_id);
          }
          break;
        }

        case "CREATE_PRESUPUESTO":
          await supabase.from("presupuestos").insert(op.payload);
          break;

        case "UPDATE_PRESUPUESTO": {
          const { data: remoto } = await supabase
            .from("presupuestos")
            .select("actualizado_en")
            .eq("id", op.entidad_id)
            .single();
          const payloadLocal = op.payload as Presupuesto;
          if (!remoto || payloadLocal.actualizado_en > remoto.actualizado_en) {
            await supabase.from("presupuestos").update(op.payload).eq("id", op.entidad_id);
          }
          break;
        }
      }
      return { exito: true };
    } catch (error) {
      return { exito: false, error: String(error), esConflicto: false };
    }
  }

  /** Reintenta manualmente todas las operaciones en estado "Error". */
  async reintentarErrores(): Promise<void> {
    const errores = await db.cola_sync.index("by-estado").getAll("Error");
    for (const op of errores) {
      await db.cola_sync.update(op.id_operacion, { estado: "Pendiente", intentos: 0 });
    }
    if (navigator.onLine) this.procesarCola();
  }

  /** Reintenta una operación específica en estado "Error". */
  async reintentarOperacion(idOperacion: string): Promise<void> {
    await db.cola_sync.update(idOperacion, { estado: "Pendiente", intentos: 0 });
    if (navigator.onLine) this.procesarCola();
  }
}
```

### Conflict Resolution Policy

| Escenario | Política | Resultado |
|---|---|---|
| Local editado, remoto sin cambios | Local gana | Se aplica el cambio local |
| Local editado, remoto más reciente | Remoto gana (last-write-wins) | Se descarta el cambio local silenciosamente |
| Local soft-delete, remoto editado | Delete local gana siempre | Se aplica `eliminado_en` al registro remoto |
| Local CREATE, remoto ya tiene el mismo ID | Tratar como UPDATE | Se evalúa `actualizado_en` para resolución |
| Local CREATE cancelado (entidad eliminada localmente antes de sync) | Se cancela la operación | No se envía nada a Supabase |

> **Nota:** El descarte silencioso del cambio local cuando el remoto es más reciente es aceptable en este contexto (uso individual, sin colaboración). Se documenta para QA. En una futura versión multi-dispositivo, se podría notificar al usuario del descarte.

### Network Detection Strategy

```typescript
// Detección de conectividad (capas complementarias)

// Capa 1: navigator.onLine + eventos del browser
window.addEventListener("online", onConectado);
window.addEventListener("offline", onDesconectado);

// Capa 2: probe request periódico (navigator.onLine puede dar falsos positivos)
async function verificarConexionReal(): Promise<boolean> {
  try {
    // HEAD request al propio servidor (lightweight)
    await fetch("/api/ping", { method: "HEAD", cache: "no-store" });
    return true;
  } catch {
    return false;
  }
}

// Capa 3: detectar fallo de red en cualquier request a Supabase
// Si un request falla con TypeError (network error), marcar como offline
// y activar la detección de reconexión.
```

### Service Worker Scope

El Service Worker en esta app tiene un alcance **limitado a assets estáticos**:

```javascript
// public/sw.js (alcance del Service Worker en el MVP)

// Cache de assets: JS bundles, CSS, imágenes, fuentes
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("gastolog-assets-v1").then((cache) =>
      cache.addAll(["/", "/_next/static/...", "/icons/..."])
    )
  );
});

self.addEventListener("fetch", (event) => {
  // Solo responder con caché para assets estáticos
  // Las llamadas a la API de Supabase NO pasan por el SW
  if (event.request.url.includes("/_next/static/") ||
      event.request.url.includes("/icons/")) {
    event.respondWith(caches.match(event.request));
  }
  // Todo lo demás: red normal (o falla si no hay conexión)
});

// NO se implementa Background Sync API en el MVP
// La cola de sync la gestiona el SyncEngine en el cliente principal
```

### API / Service Layer

```typescript
// src/hooks/useSyncEngine.ts

function useSyncEngine(): {
  estadoSync: EstadoSync;       // { online, sincronizando, pendientes, errores }
};

// src/hooks/useColaSync.ts  (para /app/sync)

function useColaSync(): {
  operaciones: OperacionSync[];
  reintentarTodo: () => Promise<void>;
  reintentarOperacion: (id: string) => Promise<void>;
  limpiarSincronizadas: () => Promise<void>;
  cargando: boolean;
};
```

```typescript
// src/contexts/sync-context.tsx

interface SyncContextValue {
  estadoSync: EstadoSync;
  encolarOperacion: (op: Omit<OperacionSync, "id_operacion" | "creada_en" | "intentos" | "estado" | "ultimo_error">) => Promise<void>;
}

// Todos los services (GastoService, CategoriaService, etc.)
// llaman a encolarOperacion() tras escribir en IndexedDB
```

### Components (/app/sync)

| Componente | Responsabilidad |
|---|---|
| `PaginaSync` | Page en `/app/sync/page.tsx`. Vista de monitoreo de la cola. |
| `ResumenSync` | Contadores: N pendientes, N errores, N sincronizados. |
| `ListaOperacionesSync` | Lista de operaciones ordenadas por `creada_en` desc. Filtrables por estado. |
| `ItemOperacionSync` | Fila: tipo de operación, entidad afectada (ej. "Gasto $12.000"), estado badge, timestamp, último error. Botón "Reintentar" si estado = Error. |
| `BotonReintentarTodo` | Resetea todas las operaciones en Error a Pendiente e inicia procesarCola(). |
| `BotonLimpiarSincronizadas` | Elimina de IndexedDB las operaciones en estado Sincronizado (limpieza de historial). |
| `BadgeOnline` | Indicador de estado de conexión (puede consumirse desde cualquier layout). |

## UI/UX Considerations

- **Invisibilidad como objetivo**: el SyncEngine debe ser transparente. El usuario no necesita interactuar con él en el flujo normal; la sync ocurre en segundo plano.
- **Contador de pendientes no intrusivo**: el dato `pendientes` se expone via `SyncContext` para que cada feature decida cómo mostrarlo (ej. badge en el tab de Ajustes, indicador en cada ítem del historial). No hay notificaciones push.
- **Página `/app/sync` como herramienta de diagnóstico**: no es parte de la navegación principal (tabs). Se accede desde Ajustes. Es para usuarios avanzados o para depurar problemas de sync.
- **Feedback en los ítems del historial**: cada `ItemGasto` muestra el `estado_sync` del gasto correspondiente (Feature 4, AC3), no el estado de la operación en cola. Esto da feedback contextual sin requerir que el usuario vaya a `/app/sync`.

## Dependencies

- **Feature 1 (Registro rápido)**: `GastoService.crear()` encola `CREATE_GASTO`.
- **Feature 2 (Categorización)**: `CategoriaService.crear/editar()` encola `CREATE_CATEGORIA` / `UPDATE_CATEGORIA`.
- **Feature 4 (Historial)**: `GastoService.editar/eliminar()` encola `UPDATE_GASTO`.
- **Feature 5 (Presupuestos)**: `PresupuestoService.crear/editar()` encola `CREATE_PRESUPUESTO` / `UPDATE_PRESUPUESTO`.
- **Feature 6 (Autenticación)**: el SyncEngine usa el token de sesión activo para autenticar los requests a Supabase. Si la sesión expira durante el sync, las operaciones fallan con error de auth y quedan en "Pendiente" para reintento cuando el usuario vuelva a autenticarse.
- **Feature 8 (Configuración)**: `PreferenciasUsuario` se inicializa directamente en Supabase (no pasa por la cola de sync, ya que es una operación de setup única).

## Edge Cases

| Caso | Comportamiento esperado |
|---|---|
| App cerrada con operaciones pendientes | La cola persiste en IndexedDB. Al reabrirla con red, el SyncEngine procesa los pendientes al iniciar. |
| Red intermitente durante procesarCola() | Al detectar offline mid-proceso, abortar el loop. Reanudar automáticamente al evento "online". |
| Operación `CREATE_GASTO` → usuario elimina el gasto antes de sync | SyncEngine detecta `eliminado_en != null` antes de enviar el CREATE y cancela la operación (AC11). |
| Misma entidad modificada en dos dispositivos distintos | El último en sincronizar prevalece por `actualizado_en` (last-write-wins). |
| Supabase devuelve error 409 (conflict / duplicate key) en CREATE | Tratar como UPDATE: hacer upsert con `actualizado_en` para resolución de conflicto. |
| Error de autenticación (401) durante sync | No reintentar automáticamente. Marcar como "Error" con mensaje "Sesión expirada. Inicia sesión de nuevo." El reintento manual funcionará tras re-autenticación. |
| IndexedDB lleno o no disponible (modo privado en algunos browsers) | Mostrar error al usuario al intentar guardar: "No se pudo guardar localmente. Intenta con conexión activa." La operación se intenta directamente en Supabase. |
| Cola con >100 operaciones pendientes (uso muy intensivo offline) | Procesar en lotes de 20 con pausa entre lotes para no bloquear el hilo principal. |
| Operación CREATE con `id` que ya existe en Supabase (retry duplicado) | Usar `upsert` (INSERT ... ON CONFLICT DO UPDATE) para manejar duplicados de forma idempotente. |
| Browser sin soporte de IndexedDB | Degradar gracefully: la app funciona solo con red; mostrar banner de advertencia. |

## Testing Strategy

### Unit Tests
- `procesarCola()` procesa en orden FIFO (por `creada_en` ascendente).
- `procesarOperacion()` incrementa `intentos` correctamente y cambia estado a "Error" tras 3 fallos.
- `procesarOperacion()` aplica backoff exponencial (espera 2s en intento 2, 4s en intento 3).
- `enviarOperacion(UPDATE_GASTO)` aplica last-write-wins: no actualiza si remoto es más reciente.
- `enviarOperacion(UPDATE_GASTO)` con `eliminado_en` local: siempre aplica el delete al remoto.
- Cancelación de CREATE: gasto con `eliminado_en` en IndexedDB → operación se cancela antes de enviar.
- `reintentarErrores()` resetea `intentos = 0` y estado a "Pendiente".
- `procesarCola()` no ejecuta concurrentemente (flag `procesando`).

### Integration Tests
- Crear gasto offline → verificar que aparece en `cola_sync` con estado "Pendiente".
- Conectar → `procesarCola()` envía a Supabase → estado cambia a "Sincronizado".
- Crear gasto offline → eliminar offline → conectar → verificar que NO se envía el CREATE a Supabase.
- Simular 3 fallos de red → operación queda en "Error" → reintento manual → "Sincronizado".
- Conflicto: editar gasto offline con `actualizado_en` > remoto → cambio aplica. Idem con `actualizado_en` < remoto → cambio descartado.
- Cola de operaciones mixtas (CREATE gasto + UPDATE categoría) → todas procesadas en orden.

### E2E Tests
- Flujo offline completo: desactivar red → registrar 3 gastos → activar red → verificar que los 3 aparecen en Supabase como sincronizados.
- Flujo con error y reintento: simular endpoint caído → crear gasto → esperar 3 intentos → estado "Error" en `/app/sync` → restaurar endpoint → reintentar manualmente → sincronizado.
- Flujo app cerrada: crear gasto offline → cerrar tab → reabrir → conectar → verificar sync.
- Verificar que el dashboard refleja gastos pendientes y muestra badge "Incluye gastos pendientes de sync".

## Performance Requirements

- **Escritura en IndexedDB** (encolar operación): < 50ms.
- **Inicio de `procesarCola()`** al detectar reconexión: < 500ms desde el evento `online`.
- **Throughput de sync**: ≥ 10 operaciones/segundo en condiciones normales de red.
- **Sin bloqueo del hilo principal**: las operaciones de IndexedDB son asíncronas. Para colas > 20 operaciones, procesar en lotes con `setTimeout` entre lotes para ceder control al hilo.
- **Tamaño máximo de cola esperado**: < 200 operaciones en el peor caso (usuario sin red por varios días). Sin necesidad de paginación ni limpieza automática de pendientes.

## Out of Scope

- Background Sync API (mayor complejidad y soporte inconsistente en browsers).
- Sincronización en tiempo real (realtime subscriptions de Supabase) para múltiples dispositivos simultáneos.
- Notificaciones push cuando se completa la sync.
- Merge inteligente de conflictos (más allá de last-write-wins).
- Sincronización de datos de lectura (el SyncEngine solo maneja escrituras; las lecturas se hacen directamente desde IndexedDB).
- Limpieza automática de operaciones sincronizadas (el usuario puede hacerla manualmente desde `/app/sync`).
- Soporte de Background Sync para sync cuando la app está cerrada (requiere Service Worker avanzado).
