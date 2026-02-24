import { getDB } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { ahora } from "@/lib/utils";
import type { PreferenciasUsuario } from "@/types";
import { PREFERENCIAS_DEFAULT } from "@/contexts/preferencias-context";

export const preferenciasService = {
  /**
   * Crea las preferencias por defecto para un usuario nuevo.
   * Escribe en IndexedDB y en Supabase directamente (sin cola de sync).
   * Es idempotente.
   */
  async inicializar(usuarioId: string): Promise<PreferenciasUsuario> {
    const db = await getDB();
    const existentes = await db.get("preferencias_usuario", usuarioId);
    if (existentes) return existentes;

    const ts = ahora();
    const prefs: PreferenciasUsuario = {
      ...PREFERENCIAS_DEFAULT,
      usuario_id: usuarioId,
      creado_en: ts,
      actualizado_en: ts,
    };

    // Escribir en IndexedDB
    await db.put("preferencias_usuario", prefs);

    // Escribir en Supabase directamente (sin cola de sync)
    try {
      const supabase = createClient();
      await supabase.from("preferencias_usuario").upsert(prefs);
    } catch {
      // No bloquear si falla la red; IndexedDB ya tiene los datos
    }

    return prefs;
  },

  /**
   * Obtiene las preferencias del usuario desde IndexedDB.
   * Si no existen, retorna los defaults.
   */
  async obtener(usuarioId: string): Promise<PreferenciasUsuario> {
    const db = await getDB();
    const ts = ahora();
    return (
      (await db.get("preferencias_usuario", usuarioId)) ?? {
        ...PREFERENCIAS_DEFAULT,
        usuario_id: usuarioId,
        creado_en: ts,
        actualizado_en: ts,
      }
    );
  },

  /**
   * Actualiza preferencias (Fase 2). Escribe en IndexedDB y Supabase.
   */
  async actualizar(
    usuarioId: string,
    cambios: Partial<
      Pick<PreferenciasUsuario, "zona_horaria" | "semana_inicia_en">
    >
  ): Promise<PreferenciasUsuario> {
    const db = await getDB();
    const existentes = await this.obtener(usuarioId);
    const actualizado: PreferenciasUsuario = {
      ...existentes,
      ...cambios,
      actualizado_en: ahora(),
    };

    await db.put("preferencias_usuario", actualizado);

    try {
      const supabase = createClient();
      await supabase
        .from("preferencias_usuario")
        .update(cambios)
        .eq("usuario_id", usuarioId);
    } catch {
      // Reintento manual cuando haya red
    }

    return actualizado;
  },
};
