# Feature Specification: Categorización de Gastos

**Status**: Draft
**Priority**: P0
**PRD Reference**: Section 4 — Feature 2
**Author**: Equipo GastoLog
**Last Updated**: 2026-02-24

## Overview

Sistema de categorías que permite al usuario clasificar cada gasto para entender sus patrones de consumo. Incluye un conjunto de categorías por defecto para nuevos usuarios, la posibilidad de crear categorías personalizadas, editar nombres existentes y desactivar categorías sin perder el historial asociado. Las categorías son la pieza central del dashboard, los filtros del historial y los presupuestos.

## User Stories

1. Como usuario nuevo, quiero encontrar categorías relevantes listas para usar (Alimentación, Transporte, etc.) para no tener que configurar nada antes de mi primer registro.
2. Como usuario, quiero seleccionar una categoría rápidamente al registrar un gasto para clasificarlo sin fricción.
3. Como usuario, quiero crear una categoría personalizada con un nombre único para cubrir gastos que no encajan en las categorías por defecto.
4. Como usuario, quiero editar el nombre de una categoría y ver el cambio reflejado en todos mis gastos históricos.
5. Como usuario, quiero desactivar una categoría que ya no uso para mantener limpia mi lista sin perder el historial de gastos asociados.
6. Como usuario, quiero que una categoría inactiva no aparezca en el formulario de registro para no confundirme con opciones viejas.

## Acceptance Criteria

- [ ] AC1: Al crear una cuenta, el sistema genera automáticamente las categorías por defecto para el usuario: Alimentación, Transporte, Entretenimiento, Salud, Hogar, Educación, Ropa, Servicios, Otros.
- [ ] AC2: El usuario puede elegir una categoría de la lista activa al crear o editar un gasto.
- [ ] AC3: El usuario puede crear una categoría personalizada con un nombre de 1 a 30 caracteres. El nombre debe ser único (sin distinción de mayúsculas) dentro de las categorías del usuario.
- [ ] AC4: La categoría creada está disponible inmediatamente en el selector de registro sin recargar la página.
- [ ] AC5: El usuario puede editar el nombre de una categoría existente. Todos los gastos asociados a esa categoría reflejan el nuevo nombre.
- [ ] AC6: El usuario no puede eliminar una categoría que tenga gastos asociados (activos o en historial). En su lugar, puede marcarla como **inactiva**.
- [ ] AC7: Una categoría inactiva no aparece en el selector al crear/editar un gasto, pero sus gastos históricos siguen mostrándose correctamente con su nombre.
- [ ] AC8: El usuario puede reactivar una categoría previamente inactivada.
- [ ] AC9: Si una categoría no tiene gastos asociados, el usuario puede eliminarla de forma permanente.
- [ ] AC10: Las categorías se listan ordenadas por el campo `orden` (ascendente) y luego por nombre alfabético para las que no tienen orden asignado.
- [ ] AC11: Los cambios en categorías (crear, editar, desactivar) se persisten offline en IndexedDB y se sincronizan con Supabase al recuperar conexión.

## Technical Design

### Architecture

Las categorías son una entidad de soporte que alimenta directamente el formulario de registro (Feature 1), el dashboard (Feature 3), el historial (Feature 4) y los presupuestos (Feature 5). La gestión se realiza en la página `/app/categorias` y los datos se cachean localmente en IndexedDB para garantizar disponibilidad offline.

```
┌──────────────────────────────────────────────────────────┐
│  /app/categorias (React Page)                            │
│  ┌──────────────────┐    ┌─────────────────────────────┐ │
│  │ ListaCategorias  │    │ FormularioCategoria         │ │
│  │ (ver/inactivar)  │    │ (crear/editar)              │ │
│  └────────┬─────────┘    └──────────────┬──────────────┘ │
│           │                             │                │
│           └──────────┬──────────────────┘                │
│                      ▼                                   │
│           ┌──────────────────────┐                       │
│           │  CategoriaService    │                       │
│           │  (CRUD + validación) │                       │
│           └──────────┬───────────┘                       │
│                      │                                   │
│           ┌──────────▼───────────┐                       │
│           │  IndexedDB (local)   │ ◄──── SyncEngine      │
│           └──────────────────────┘           │           │
│                                              ▼           │
│                                         Supabase         │
└──────────────────────────────────────────────────────────┘
```

**Notas de diseño:**
- Al registrarse el usuario, `AuthService` llama a `CategoriaService.inicializarDefaults()` para insertar las 9 categorías por defecto.
- El hook `useCategorias()` expone la lista de categorías activas desde IndexedDB; el resto de features la consumen sin lógica adicional.
- Las operaciones de escritura siempre van a IndexedDB primero; el SyncEngine las propaga a Supabase.

### Data Models

```typescript
// Entidad principal
interface Categoria {
  id: string;              // UUID v4, generado en cliente
  usuario_id: string;      // UUID de Supabase Auth
  nombre: string;          // 1–30 caracteres, único por usuario (case-insensitive)
  color: string | null;    // Token de color (ej. "blue", "green"). No especificación de UI.
  activa: boolean;         // false = inactiva (no aparece en selector de registro)
  orden: number | null;    // Entero para ordenamiento manual
  creado_en: string;       // ISO 8601 timestamp
  actualizado_en: string;  // ISO 8601 timestamp
}

// Payload para crear una categoría
interface CrearCategoriaInput {
  nombre: string;
  color?: string;
  orden?: number;
}

// Payload para editar una categoría
interface EditarCategoriaInput {
  id: string;
  nombre?: string;
  color?: string;
  orden?: number;
  activa?: boolean;
}

// Categorías por defecto (seed al crear cuenta)
const CATEGORIAS_DEFAULT: Pick<Categoria, "nombre" | "color" | "orden">[] = [
  { nombre: "Alimentación",    color: "orange", orden: 1 },
  { nombre: "Transporte",      color: "blue",   orden: 2 },
  { nombre: "Entretenimiento", color: "purple", orden: 3 },
  { nombre: "Salud",           color: "red",    orden: 4 },
  { nombre: "Hogar",           color: "green",  orden: 5 },
  { nombre: "Educación",       color: "cyan",   orden: 6 },
  { nombre: "Ropa",            color: "pink",   orden: 7 },
  { nombre: "Servicios",       color: "yellow", orden: 8 },
  { nombre: "Otros",           color: "gray",   orden: 9 },
];

// Operaciones en cola de sincronización
type TipoOperacionCategoria = "CREATE_CATEGORIA" | "UPDATE_CATEGORIA";

interface OperacionSyncCategoria {
  id_operacion: string;
  tipo: TipoOperacionCategoria;
  payload: Categoria;
  creada_en: string;
  intentos: number;        // Máx 3
  estado: "Pendiente" | "Sincronizando" | "Sincronizado" | "Error";
}
```

### Database Schema (Supabase/Postgres)

```sql
CREATE TABLE categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  nombre TEXT NOT NULL CHECK (char_length(nombre) BETWEEN 1 AND 30),
  color TEXT,
  activa BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unicidad de nombre por usuario (case-insensitive)
  CONSTRAINT uq_categoria_nombre_usuario UNIQUE (usuario_id, lower(nombre))
);

-- RLS: cada usuario solo ve sus categorías
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios ven sus categorias"
  ON categorias FOR ALL
  USING (auth.uid() = usuario_id);

-- Índices
CREATE INDEX idx_categorias_usuario ON categorias (usuario_id);
CREATE INDEX idx_categorias_usuario_activa ON categorias (usuario_id, activa);
```

> **Nota sobre eliminación:** No se implementa `DELETE` físico en Supabase para categorías con gastos asociados. La desactivación usa `activa = false`. La eliminación permanente solo aplica si el conteo de gastos asociados es 0 (verificado en cliente y en RLS/trigger).

### API / Service Layer

```typescript
// src/services/categoria-service.ts

class CategoriaService {
  /**
   * Inserta las 9 categorías por defecto para un usuario nuevo.
   * Se llama una sola vez al completar el registro.
   */
  async inicializarDefaults(usuarioId: string): Promise<void>;

  /**
   * Retorna todas las categorías del usuario desde IndexedDB.
   * Por defecto solo las activas; pasar { incluirInactivas: true } para todas.
   */
  async listar(opciones?: { incluirInactivas?: boolean }): Promise<Categoria[]>;

  /**
   * Crea una categoría: valida unicidad, escribe en IndexedDB y encola sync.
   */
  async crear(input: CrearCategoriaInput, usuarioId: string): Promise<Categoria>;

  /**
   * Edita nombre, color, orden o activa de una categoría.
   * Actualiza IndexedDB y encola sync.
   */
  async editar(input: EditarCategoriaInput): Promise<Categoria>;

  /**
   * Marca la categoría como inactiva. Requiere que tenga gastos asociados.
   */
  async desactivar(id: string): Promise<void>;

  /**
   * Elimina permanentemente. Solo permitido si gastos asociados = 0.
   */
  async eliminar(id: string): Promise<void>;

  /**
   * Verifica si un nombre de categoría ya existe para el usuario (case-insensitive).
   */
  async existeNombre(nombre: string, excluirId?: string): Promise<boolean>;
}
```

```typescript
// src/hooks/useCategorias.ts

function useCategorias(): {
  categorias: Categoria[];          // Solo activas
  todasCategorias: Categoria[];     // Activas + inactivas
  cargando: boolean;
};

function useGestionCategorias(): {
  crear: (input: CrearCategoriaInput) => Promise<void>;
  editar: (input: EditarCategoriaInput) => Promise<void>;
  desactivar: (id: string) => Promise<void>;
  eliminar: (id: string) => Promise<void>;
  guardando: boolean;
  error: string | null;
};
```

### Components

| Componente | Responsabilidad |
|---|---|
| `PaginaCategorias` | Page en `/app/categorias/page.tsx`. Layout, estado global de la página. |
| `ListaCategorias` | Renderiza la lista ordenada. Sección activas / sección inactivas colapsable. |
| `ItemCategoria` | Fila individual: nombre, badge de color, botones editar / desactivar / eliminar. Muestra conteo de gastos. |
| `FormularioCategoria` | Form de crear/editar: input nombre (con contador), selector de color, campo orden. Modal o inline. |
| `BadgeColor` | Pastilla visual del color de categoría. Usa tokens (no colores hardcodeados). |
| `SelectorCategoria` | Componente reutilizable usado en `FormularioGasto` y `FormularioPresupuesto`. Lista/grid de chips de categorías activas. Emite `onChange(categoriaId)`. |

### Validation Rules

| Campo | Regla | Mensaje de error |
|---|---|---|
| `nombre` | Obligatorio, 1–30 caracteres | "El nombre debe tener entre 1 y 30 caracteres" |
| `nombre` | Único por usuario (case-insensitive) | "Ya existe una categoría con ese nombre" |
| `color` | Opcional; si se provee, debe ser un token válido del sistema | "Color no válido" |
| `orden` | Opcional; si se provee, debe ser entero ≥ 1 | "El orden debe ser un número entero positivo" |
| Eliminar | Solo si `conteo_gastos === 0` | "No puedes eliminar una categoría con gastos. Puedes inactivarla." |

## UI/UX Considerations

- **Acceso desde el registro**: si el usuario no encuentra su categoría en el selector de `/app/registrar`, hay un link directo a `/app/categorias` para crearla. Al volver, la nueva categoría aparece preseleccionada.
- **Última categoría recordada**: el `SelectorCategoria` preselecciona la última categoría usada (almacenada en `localStorage`) para acelerar registros repetidos.
- **Sección inactivas colapsada**: en `/app/categorias`, las categorías inactivas se muestran en una sección colapsada al final de la lista, para no contaminar la vista principal.
- **Feedback de unicidad**: la validación de nombre único se ejecuta `onBlur` (no en tiempo real) para evitar llamadas excesivas a IndexedDB.
- **Chips en el selector**: en el formulario de registro, las categorías activas se muestran como chips/grid. Si son ≤ 9, caben sin scroll; si son más, el selector abre un modal o usa scroll interno.

## Dependencies

- **Feature 1 (Registro rápido)**: consume `SelectorCategoria` y necesita categorías activas disponibles offline.
- **Feature 3 (Dashboard)**: agrupa métricas por `categoria_id` / `nombre`.
- **Feature 4 (Historial)**: filtra gastos por `categoria_id`.
- **Feature 5 (Presupuestos)**: asocia presupuestos a una `categoria_id`.
- **Feature 6 (Autenticación)**: el evento de registro exitoso dispara `inicializarDefaults()`.
- **Feature 7 (Offline/Sync)**: los cambios de categorías (CREATE, UPDATE) se enolan en IndexedDB y se sincronizan con Supabase.

## Edge Cases

| Caso | Comportamiento esperado |
|---|---|
| Usuario intenta crear categoría con nombre duplicado | Validar `onBlur` y al guardar. Mostrar error inline: "Ya existe una categoría con ese nombre." |
| Usuario edita nombre a uno ya existente | Misma validación, excluyendo la propia categoría del check de unicidad. |
| Usuario desactiva categoría con presupuesto activo | Permitir desactivación. Advertir: "Esta categoría tiene un presupuesto activo. El presupuesto permanecerá pero la categoría no aparecerá en el registro." |
| Usuario intenta eliminar categoría con gastos | Bloquear con mensaje. Ofrecer botón "Inactivar en su lugar". |
| Sin categorías activas | Mostrar estado vacío con CTA para crear una o restaurar las categorías por defecto. |
| Categorías por defecto editadas/inactivadas | Respetar la decisión del usuario. No forzar restauración automática. |
| Offline al crear categoría | Guardar en IndexedDB con `estado_sync = "Pendiente"`. Disponible inmediatamente para usarse en registro. |
| Conflicto de sync: nombre cambiado local y remotamente | Last-write-wins por `actualizado_en`. El nombre más reciente gana. |
| Orden duplicado entre dos categorías | Permitirlo; ordenar por `orden ASC, nombre ASC` para desempate determinístico. |

## Testing Strategy

### Unit Tests
- Validación de `nombre` (longitud, unicidad case-insensitive).
- `inicializarDefaults()` genera exactamente 9 categorías con los campos correctos.
- `existeNombre()` es case-insensitive ("alimentación" == "Alimentación").
- `eliminar()` lanza error si `conteo_gastos > 0`.

### Integration Tests
- Crear categoría: escribe en IndexedDB y aparece en `useCategorias()`.
- Editar nombre: todos los gastos en IndexedDB reflejan el nombre actualizado en las consultas.
- Desactivar: la categoría desaparece del `SelectorCategoria` en el formulario de registro.
- Reactivar: la categoría vuelve a aparecer en el selector.
- Sync: operación `CREATE_CATEGORIA` / `UPDATE_CATEGORIA` se envía a Supabase y se marca como sincronizada.
- RLS: un usuario no puede leer ni escribir categorías de otro usuario.

### E2E Tests
- Flujo completo: ir a Categorías → crear "Mascotas" → volver a Registrar → verificar que aparece en selector.
- Flujo desactivar: desactivar "Ropa" → verificar que no aparece en el formulario de registro → verificar que gastos previos de "Ropa" siguen visibles en historial.
- Flujo eliminar (sin gastos): crear categoría nueva → intentar eliminarla → confirmar que desaparece.
- Flujo bloqueo de eliminación: categoría con gastos → botón eliminar → ver error → botón "Inactivar" funciona.

## Performance Requirements

- **Carga de categorías**: < 50ms desde IndexedDB (lista completa en caché local).
- **Operación de creación/edición**: < 100ms para escritura en IndexedDB.
- **Cantidad esperada**: máx ~30 categorías por usuario en uso normal. No requiere paginación.

## Out of Scope

- Subcategorías o jerarquías de categorías.
- Iconos por categoría (solo color en MVP).
- Importar/exportar lista de categorías.
- Categorías compartidas entre usuarios.
- Reordenamiento visual por drag-and-drop (el campo `orden` existe pero no se expone en UI de MVP).
- Restaurar categorías por defecto si el usuario las eliminó.
