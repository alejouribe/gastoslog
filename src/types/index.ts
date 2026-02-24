// ─── Enums ────────────────────────────────────────────────────────────────────

export type MetodoDePago = "Efectivo" | "Tarjeta" | "Transferencia" | "Otro";

export type EstadoSyncEntidad = "Sincronizado" | "Pendiente" | "Error";

export type DiaSemana = "Lunes" | "Domingo";

export type Periodo = "Hoy" | "Semana" | "Mes";

export type TipoOperacion =
  | "CREATE_GASTO"
  | "UPDATE_GASTO"
  | "CREATE_CATEGORIA"
  | "UPDATE_CATEGORIA"
  | "CREATE_PRESUPUESTO"
  | "UPDATE_PRESUPUESTO";

export type EstadoOperacion =
  | "Pendiente"
  | "Sincronizando"
  | "Sincronizado"
  | "Error";

// ─── Entidades de dominio ──────────────────────────────────────────────────────

export interface Gasto {
  id: string;
  usuario_id: string;
  categoria_id: string;
  monto_cop: number;
  fecha_hora: string;
  metodo_de_pago: MetodoDePago;
  nota: string | null;
  estado_sync: EstadoSyncEntidad;
  creado_en: string;
  actualizado_en: string;
  eliminado_en: string | null;
}

export interface Categoria {
  id: string;
  usuario_id: string;
  nombre: string;
  color: string | null;
  activa: boolean;
  orden: number | null;
  creado_en: string;
  actualizado_en: string;
}

export interface Presupuesto {
  id: string;
  usuario_id: string;
  categoria_id: string;
  mes: string;
  monto_objetivo_cop: number;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface PreferenciasUsuario {
  usuario_id: string;
  moneda: string;
  zona_horaria: string;
  semana_inicia_en: DiaSemana;
  creado_en: string;
  actualizado_en: string;
}

// ─── Inputs de formulario ──────────────────────────────────────────────────────

export interface CrearGastoInput {
  monto_cop: number;
  categoria_id: string;
  metodo_de_pago: MetodoDePago;
  nota?: string;
  fecha_hora?: string;
}

export interface EditarGastoInput {
  id: string;
  monto_cop?: number;
  categoria_id?: string;
  metodo_de_pago?: MetodoDePago;
  fecha_hora?: string;
  nota?: string | null;
}

export interface CrearCategoriaInput {
  nombre: string;
  color?: string;
  orden?: number;
}

export interface EditarCategoriaInput {
  id: string;
  nombre?: string;
  color?: string;
  orden?: number;
  activa?: boolean;
}

export interface CrearPresupuestoInput {
  categoria_id: string;
  mes: string;
  monto_objetivo_cop: number;
}

export interface EditarPresupuestoInput {
  id: string;
  monto_objetivo_cop?: number;
  activo?: boolean;
}

// ─── Cola de sincronización ────────────────────────────────────────────────────

export interface OperacionSync {
  id_operacion: string;
  tipo: TipoOperacion;
  payload: Record<string, unknown>;
  entidad_id: string;
  usuario_id: string;
  creada_en: string;
  intentos: number;
  ultimo_error: string | null;
  estado: EstadoOperacion;
}

// ─── Modelos calculados (runtime) ─────────────────────────────────────────────

export interface PresupuestoConConsumo extends Presupuesto {
  categoria_nombre: string;
  categoria_color: string | null;
  monto_consumido_cop: number;
  porcentaje_consumo: number;
  excedido: boolean;
}

export interface GastoCategoria {
  categoria_id: string;
  categoria_nombre: string;
  categoria_color: string | null;
  total_cop: number;
  porcentaje: number;
}

export interface GastoDia {
  fecha: string;
  total_cop: number;
}

export interface AgregadosDashboard {
  periodo: Periodo;
  rango: { desde: Date; hasta: Date };
  total_periodo_cop: number;
  gasto_por_categoria: GastoCategoria[];
  gasto_por_dia: GastoDia[];
  tiene_pendientes: boolean;
}

// ─── Filtros de consulta ───────────────────────────────────────────────────────

export interface FiltrosHistorial {
  categoria_id?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  texto?: string;
}

export interface PaginacionHistorial {
  limite: number;
  cursor?: string;
}

export interface ResultadoHistorial {
  gastos: Gasto[];
  hayMas: boolean;
  totalFiltrado: number;
}

// ─── Estado del SyncEngine ────────────────────────────────────────────────────

export interface EstadoSync {
  online: boolean;
  sincronizando: boolean;
  pendientes: number;
  errores: number;
}

// ─── Contexto de autenticación ────────────────────────────────────────────────

export interface Usuario {
  id: string;
  email: string | undefined;
}
