import { getDB } from "@/lib/db";
import { generarUUID, ahora } from "@/lib/utils";
import type {
  Gasto,
  CrearGastoInput,
  EditarGastoInput,
  FiltrosHistorial,
  PaginacionHistorial,
  ResultadoHistorial,
} from "@/types";

export const gastoService = {
  /**
   * Crea un gasto: escribe en IndexedDB.
   * Retorna el gasto con id local asignado.
   */
  async crear(input: CrearGastoInput, usuarioId: string): Promise<Gasto> {
    const ts = ahora();
    const gasto: Gasto = {
      id: generarUUID(),
      usuario_id: usuarioId,
      categoria_id: input.categoria_id,
      monto_cop: Math.trunc(input.monto_cop),
      fecha_hora: input.fecha_hora ?? ts,
      metodo_de_pago: input.metodo_de_pago,
      nota: input.nota?.trim() || null,
      estado_sync: "Pendiente",
      creado_en: ts,
      actualizado_en: ts,
      eliminado_en: null,
    };

    const db = await getDB();
    await db.put("gastos", gasto);
    return gasto;
  },

  /**
   * Obtiene un gasto por ID.
   */
  async obtenerPorId(id: string): Promise<Gasto | null> {
    const db = await getDB();
    return (await db.get("gastos", id)) ?? null;
  },

  /**
   * Lista todos los gastos activos del usuario (para dashboard, etc.).
   */
  async listar(usuarioId: string): Promise<Gasto[]> {
    const db = await getDB();
    const todos = await db.getAllFromIndex(
      "gastos",
      "by-usuario-fecha",
      IDBKeyRange.bound(
        [usuarioId, ""],
        [usuarioId, "\uffff"]
      )
    );
    return todos
      .filter((g) => !g.eliminado_en)
      .sort((a, b) => b.fecha_hora.localeCompare(a.fecha_hora));
  },

  /**
   * Lista gastos con filtros, búsqueda y paginación.
   */
  async listarFiltrado(
    usuarioId: string,
    filtros: FiltrosHistorial,
    paginacion: PaginacionHistorial = { limite: 20 }
  ): Promise<ResultadoHistorial> {
    const todos = await this.listar(usuarioId);

    // Aplicar filtros
    let filtrados = todos.filter((g) => {
      if (filtros.categoria_id && g.categoria_id !== filtros.categoria_id)
        return false;
      if (filtros.fecha_desde && g.fecha_hora < filtros.fecha_desde)
        return false;
      if (filtros.fecha_hasta) {
        const hastaFin = filtros.fecha_hasta + "T23:59:59.999Z";
        if (g.fecha_hora > hastaFin) return false;
      }
      if (filtros.texto) {
        const texto = filtros.texto.toLowerCase();
        const nota = (g.nota ?? "").toLowerCase();
        if (!nota.includes(texto)) return false;
      }
      return true;
    });

    const totalFiltrado = filtrados.length;

    // Paginación por cursor
    if (paginacion.cursor) {
      const idx = filtrados.findIndex((g) => g.fecha_hora < paginacion.cursor!);
      filtrados = idx >= 0 ? filtrados.slice(idx) : [];
    }

    const hayMas = filtrados.length > paginacion.limite;
    const gastos = filtrados.slice(0, paginacion.limite);

    return { gastos, hayMas, totalFiltrado };
  },

  /**
   * Edita un gasto existente en IndexedDB.
   */
  async editar(input: EditarGastoInput): Promise<Gasto> {
    const db = await getDB();
    const existente = await db.get("gastos", input.id);
    if (!existente) throw new Error("Gasto no encontrado.");

    const actualizado: Gasto = {
      ...existente,
      monto_cop:
        input.monto_cop !== undefined
          ? Math.trunc(input.monto_cop)
          : existente.monto_cop,
      categoria_id: input.categoria_id ?? existente.categoria_id,
      metodo_de_pago: input.metodo_de_pago ?? existente.metodo_de_pago,
      fecha_hora: input.fecha_hora ?? existente.fecha_hora,
      nota:
        input.nota !== undefined
          ? input.nota?.trim() || null
          : existente.nota,
      estado_sync: "Pendiente",
      actualizado_en: ahora(),
    };

    await db.put("gastos", actualizado);
    return actualizado;
  },

  /**
   * Soft delete: establece eliminado_en en IndexedDB.
   */
  async eliminar(id: string): Promise<Gasto> {
    const db = await getDB();
    const existente = await db.get("gastos", id);
    if (!existente) throw new Error("Gasto no encontrado.");

    const eliminado: Gasto = {
      ...existente,
      eliminado_en: ahora(),
      actualizado_en: ahora(),
      estado_sync: "Pendiente",
    };

    await db.put("gastos", eliminado);
    return eliminado;
  },
};
