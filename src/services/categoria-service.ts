import { getDB } from "@/lib/db";
import { generarUUID, ahora } from "@/lib/utils";
import type {
  Categoria,
  CrearCategoriaInput,
  EditarCategoriaInput,
} from "@/types";

// ─── Categorías por defecto ───────────────────────────────────────────────────

export const CATEGORIAS_DEFAULT: Pick<
  Categoria,
  "nombre" | "color" | "orden"
>[] = [
  { nombre: "Alimentación", color: "orange", orden: 1 },
  { nombre: "Transporte", color: "blue", orden: 2 },
  { nombre: "Entretenimiento", color: "purple", orden: 3 },
  { nombre: "Salud", color: "red", orden: 4 },
  { nombre: "Hogar", color: "green", orden: 5 },
  { nombre: "Educación", color: "cyan", orden: 6 },
  { nombre: "Ropa", color: "pink", orden: 7 },
  { nombre: "Servicios", color: "yellow", orden: 8 },
  { nombre: "Otros", color: "gray", orden: 9 },
];

// ─── Mapa de colores a clases Tailwind ────────────────────────────────────────

export const COLOR_CLASES: Record<string, string> = {
  orange: "bg-orange-100 text-orange-700 border-orange-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  purple: "bg-purple-100 text-purple-700 border-purple-200",
  red: "bg-red-100 text-red-700 border-red-200",
  green: "bg-green-100 text-green-700 border-green-200",
  cyan: "bg-cyan-100 text-cyan-700 border-cyan-200",
  pink: "bg-pink-100 text-pink-700 border-pink-200",
  yellow: "bg-yellow-100 text-yellow-700 border-yellow-200",
  gray: "bg-gray-100 text-gray-700 border-gray-200",
};

export const COLOR_DOT: Record<string, string> = {
  orange: "bg-orange-400",
  blue: "bg-blue-400",
  purple: "bg-purple-400",
  red: "bg-red-400",
  green: "bg-green-400",
  cyan: "bg-cyan-400",
  pink: "bg-pink-400",
  yellow: "bg-yellow-400",
  gray: "bg-gray-400",
};

// ─── Servicio ─────────────────────────────────────────────────────────────────

export const categoriaService = {
  /**
   * Crea las categorías por defecto para un usuario nuevo.
   * Es idempotente: no duplica si ya existen.
   */
  async inicializarDefaults(usuarioId: string): Promise<void> {
    const db = await getDB();
    const existentes = await db.getAllFromIndex(
      "categorias",
      "by-usuario",
      usuarioId
    );
    if (existentes.length > 0) return;

    const ts = ahora();
    const tx = db.transaction("categorias", "readwrite");
    await Promise.all([
      ...CATEGORIAS_DEFAULT.map((cat) =>
        tx.store.put({
          id: generarUUID(),
          usuario_id: usuarioId,
          nombre: cat.nombre,
          color: cat.color ?? null,
          activa: true,
          orden: cat.orden ?? null,
          creado_en: ts,
          actualizado_en: ts,
        } satisfies Categoria)
      ),
      tx.done,
    ]);
  },

  /**
   * Lista categorías del usuario. Por defecto solo activas.
   */
  async listar(
    usuarioId: string,
    opciones: { incluirInactivas?: boolean } = {}
  ): Promise<Categoria[]> {
    const db = await getDB();
    
    // Obtener todas las categorías del usuario
    const todas = await db.getAllFromIndex("categorias", "by-usuario", usuarioId);
    
    // Filtrar por activa si es necesario
    let cats = opciones.incluirInactivas 
      ? todas 
      : todas.filter(c => c.activa === true);

    // Ordenar por orden ASC, luego nombre ASC
    return cats.sort((a, b) => {
      if (a.orden !== null && b.orden !== null) return a.orden - b.orden;
      if (a.orden !== null) return -1;
      if (b.orden !== null) return 1;
      return a.nombre.localeCompare(b.nombre, "es");
    });
  },

  /**
   * Obtiene una categoría por ID.
   */
  async obtenerPorId(id: string): Promise<Categoria | null> {
    const db = await getDB();
    return (await db.get("categorias", id)) ?? null;
  },

  /**
   * Crea una nueva categoría en IndexedDB.
   */
  async crear(
    input: CrearCategoriaInput,
    usuarioId: string
  ): Promise<Categoria> {
    const existe = await this.existeNombre(input.nombre, usuarioId);
    if (existe) throw new Error("Ya existe una categoría con ese nombre.");

    const ts = ahora();
    const nueva: Categoria = {
      id: generarUUID(),
      usuario_id: usuarioId,
      nombre: input.nombre.trim(),
      color: input.color ?? null,
      activa: true,
      orden: input.orden ?? null,
      creado_en: ts,
      actualizado_en: ts,
    };

    const db = await getDB();
    await db.put("categorias", nueva);
    return nueva;
  },

  /**
   * Edita una categoría existente.
   */
  async editar(input: EditarCategoriaInput): Promise<Categoria> {
    const db = await getDB();
    const existente = await db.get("categorias", input.id);
    if (!existente) throw new Error("Categoría no encontrada.");

    if (input.nombre && input.nombre !== existente.nombre) {
      const existe = await this.existeNombre(
        input.nombre,
        existente.usuario_id,
        input.id
      );
      if (existe) throw new Error("Ya existe una categoría con ese nombre.");
    }

    const actualizada: Categoria = {
      ...existente,
      nombre: input.nombre?.trim() ?? existente.nombre,
      color: input.color !== undefined ? input.color : existente.color,
      orden: input.orden !== undefined ? input.orden : existente.orden,
      activa: input.activa !== undefined ? input.activa : existente.activa,
      actualizado_en: ahora(),
    };

    await db.put("categorias", actualizada);
    return actualizada;
  },

  /**
   * Verifica si un nombre ya existe para el usuario (case-insensitive).
   */
  async existeNombre(
    nombre: string,
    usuarioId: string,
    excluirId?: string
  ): Promise<boolean> {
    const cats = await this.listar(usuarioId, { incluirInactivas: true });
    return cats.some(
      (c) =>
        c.nombre.toLowerCase() === nombre.toLowerCase() &&
        c.id !== excluirId
    );
  },

  /**
   * Cuenta los gastos asociados a una categoría (para validar eliminación).
   */
  async contarGastos(categoriaId: string, usuarioId: string): Promise<number> {
    const db = await getDB();
    const gastos = await db.getAllFromIndex(
      "gastos",
      "by-usuario-categoria",
      [usuarioId, categoriaId]
    );
    return gastos.filter((g) => !g.eliminado_en).length;
  },

  /**
   * Desactiva una categoría (no aparecerá en el selector de registro).
   */
  async desactivar(id: string): Promise<Categoria> {
    return this.editar({ id, activa: false });
  },

  /**
   * Reactiva una categoría previamente desactivada.
   */
  async reactivar(id: string): Promise<Categoria> {
    return this.editar({ id, activa: true });
  },

  /**
   * Elimina permanentemente una categoría.
   * Solo permitido si no tiene gastos asociados.
   */
  async eliminar(id: string, usuarioId: string): Promise<void> {
    const conteo = await this.contarGastos(id, usuarioId);
    if (conteo > 0) {
      throw new Error(
        "No puedes eliminar una categoría con gastos. Puedes inactivarla."
      );
    }

    const db = await getDB();
    await db.delete("categorias", id);
  },
};
