import { getDB } from "@/lib/db";
import { generarUUID, ahora } from "@/lib/utils";
import { toYYYYMM } from "@/lib/periodos";
import type {
  Presupuesto,
  PresupuestoConConsumo,
  CrearPresupuestoInput,
  EditarPresupuestoInput,
  Gasto,
  Categoria,
} from "@/types";

export const presupuestoService = {
  /**
   * Lista presupuestos del usuario para un mes específico.
   */
  async listar(
    usuarioId: string,
    mes: string,
    opciones: { incluirInactivos?: boolean } = {}
  ): Promise<Presupuesto[]> {
    const db = await getDB();
    const todos = await db.getAllFromIndex(
      "presupuestos",
      "by-usuario-mes",
      [usuarioId, mes]
    );

    if (opciones.incluirInactivos) {
      return todos;
    }

    return todos.filter((p) => p.activo);
  },

  /**
   * Obtiene un presupuesto por ID.
   */
  async obtenerPorId(id: string): Promise<Presupuesto | null> {
    const db = await getDB();
    return (await db.get("presupuestos", id)) ?? null;
  },

  /**
   * Calcula los consumos para los presupuestos del mes.
   */
  async calcularConsumos(
    usuarioId: string,
    mes: string,
    zonaHoraria: string,
    opciones: { incluirInactivos?: boolean } = {}
  ): Promise<PresupuestoConConsumo[]> {
    const db = await getDB();

    const [presupuestos, allGastos, allCategorias] = await Promise.all([
      this.listar(usuarioId, mes, opciones),
      db.getAll("gastos"),
      db.getAll("categorias"),
    ]);

    // Filtrar por usuario
    const gastos = allGastos.filter((g) => g.usuario_id === usuarioId);
    const categorias = allCategorias.filter((c) => c.usuario_id === usuarioId);

    const categoriasMap = new Map(categorias.map((c) => [c.id, c]));

    const gastosDelMes = gastos.filter((g) => {
      if (g.eliminado_en) return false;
      const mesGasto = toYYYYMM(g.fecha_hora, zonaHoraria);
      return mesGasto === mes;
    });

    const gastoPorCategoria = new Map<string, number>();
    for (const gasto of gastosDelMes) {
      const actual = gastoPorCategoria.get(gasto.categoria_id) ?? 0;
      gastoPorCategoria.set(gasto.categoria_id, actual + gasto.monto_cop);
    }

    return presupuestos.map((p) => {
      const categoria = categoriasMap.get(p.categoria_id);
      const consumido = gastoPorCategoria.get(p.categoria_id) ?? 0;
      const porcentaje =
        p.monto_objetivo_cop > 0
          ? Math.round((consumido / p.monto_objetivo_cop) * 1000) / 10
          : 0;

      return {
        ...p,
        categoria_nombre: categoria?.nombre ?? "Sin categoría",
        categoria_color: categoria?.color ?? null,
        monto_consumido_cop: consumido,
        porcentaje_consumo: porcentaje,
        excedido: consumido > p.monto_objetivo_cop,
      };
    });
  },

  /**
   * Verifica si ya existe un presupuesto para la categoría y mes.
   */
  async existeParaMesCategoria(
    usuarioId: string,
    categoriaId: string,
    mes: string,
    excluirId?: string
  ): Promise<boolean> {
    const presupuestos = await this.listar(usuarioId, mes, { incluirInactivos: true });
    return presupuestos.some(
      (p) => p.categoria_id === categoriaId && p.id !== excluirId
    );
  },

  /**
   * Crea un nuevo presupuesto.
   */
  async crear(
    input: CrearPresupuestoInput,
    usuarioId: string
  ): Promise<Presupuesto> {
    const existe = await this.existeParaMesCategoria(
      usuarioId,
      input.categoria_id,
      input.mes
    );
    if (existe) {
      throw new Error("Ya tienes un presupuesto para esta categoría en este mes");
    }

    const ts = ahora();
    const nuevo: Presupuesto = {
      id: generarUUID(),
      usuario_id: usuarioId,
      categoria_id: input.categoria_id,
      mes: input.mes,
      monto_objetivo_cop: Math.trunc(input.monto_objetivo_cop),
      activo: true,
      creado_en: ts,
      actualizado_en: ts,
    };

    const db = await getDB();
    await db.put("presupuestos", nuevo);
    return nuevo;
  },

  /**
   * Edita un presupuesto existente.
   */
  async editar(input: EditarPresupuestoInput): Promise<Presupuesto> {
    const db = await getDB();
    const existente = await db.get("presupuestos", input.id);
    if (!existente) throw new Error("Presupuesto no encontrado.");

    const actualizado: Presupuesto = {
      ...existente,
      monto_objetivo_cop:
        input.monto_objetivo_cop !== undefined
          ? Math.trunc(input.monto_objetivo_cop)
          : existente.monto_objetivo_cop,
      activo: input.activo !== undefined ? input.activo : existente.activo,
      actualizado_en: ahora(),
    };

    await db.put("presupuestos", actualizado);
    return actualizado;
  },

  /**
   * Desactiva un presupuesto.
   */
  async desactivar(id: string): Promise<Presupuesto> {
    return this.editar({ id, activo: false });
  },

  /**
   * Obtiene las categorías que ya tienen presupuesto en el mes.
   */
  async categoriasConPresupuesto(
    usuarioId: string,
    mes: string
  ): Promise<Set<string>> {
    const presupuestos = await this.listar(usuarioId, mes, { incluirInactivos: true });
    return new Set(presupuestos.map((p) => p.categoria_id));
  },
};
