"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { EstadoSync, OperacionSync, TipoOperacion } from "@/types";
import { getDB } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { generarUUID, esperar, ahora, estaOnline } from "@/lib/utils";

// ─── Context ───────────────────────────────────────────────────────────────────

interface SyncContextValue {
  estadoSync: EstadoSync;
  encolarOperacion: (
    op: Omit<
      OperacionSync,
      "id_operacion" | "creada_en" | "intentos" | "estado" | "ultimo_error"
    >
  ) => Promise<void>;
  reintentarErrores: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

const MAX_INTENTOS = 3;

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SyncProvider({ children }: { children: ReactNode }) {
  const [estadoSync, setEstadoSync] = useState<EstadoSync>({
    online: estaOnline(),
    sincronizando: false,
    pendientes: 0,
    errores: 0,
  });

  const procesandoRef = useRef(false);
  const supabase = createClient();

  // ── Actualizar contadores ──────────────────────────────────────────────────
  const actualizarContadores = useCallback(async () => {
    try {
      const db = await getDB();
      const pendientes = await db.getAllFromIndex(
        "cola_sync",
        "by-estado",
        "Pendiente"
      );
      const errores = await db.getAllFromIndex(
        "cola_sync",
        "by-estado",
        "Error"
      );
      setEstadoSync((prev) => ({
        ...prev,
        pendientes: pendientes.length,
        errores: errores.length,
      }));
    } catch {
      // IndexedDB no disponible
    }
  }, []);

  // ── Encolar operación ─────────────────────────────────────────────────────
  const encolarOperacion = useCallback(
    async (
      op: Omit<
        OperacionSync,
        "id_operacion" | "creada_en" | "intentos" | "estado" | "ultimo_error"
      >
    ) => {
      const operacion: OperacionSync = {
        ...op,
        id_operacion: generarUUID(),
        creada_en: ahora(),
        intentos: 0,
        estado: "Pendiente",
        ultimo_error: null,
      };

      try {
        const db = await getDB();
        await db.add("cola_sync", operacion);
        await actualizarContadores();

        // Disparar sync si hay conexión
        if (estaOnline()) {
          window.dispatchEvent(new CustomEvent("nueva-operacion-encolada"));
        }
      } catch (err) {
        console.error("Error al encolar operación:", err);
      }
    },
    [actualizarContadores]
  );

  // ── Enviar operación a Supabase ────────────────────────────────────────────
  const enviarOperacion = useCallback(
    async (op: OperacionSync): Promise<{ exito: boolean; error?: string }> => {
      try {
        const payload = op.payload as Record<string, unknown>;

        switch (op.tipo as TipoOperacion) {
          case "CREATE_GASTO":
            await supabase.from("gastos").upsert(payload);
            break;
          case "UPDATE_GASTO": {
            const { eliminado_en, actualizado_en } = payload as {
              eliminado_en?: string | null;
              actualizado_en?: string;
            };
            if (eliminado_en) {
              // Soft delete siempre prevalece
              await supabase
                .from("gastos")
                .update({ eliminado_en, actualizado_en })
                .eq("id", op.entidad_id);
            } else {
              // Last-write-wins: obtener actualizado_en remoto
              const { data: remoto } = await supabase
                .from("gastos")
                .select("actualizado_en, eliminado_en")
                .eq("id", op.entidad_id)
                .single();

              if (
                !remoto ||
                (!remoto.eliminado_en &&
                  String(actualizado_en) > String(remoto.actualizado_en))
              ) {
                await supabase
                  .from("gastos")
                  .update(payload)
                  .eq("id", op.entidad_id);
              }
            }
            break;
          }
          case "CREATE_CATEGORIA":
            await supabase.from("categorias").upsert(payload);
            break;
          case "UPDATE_CATEGORIA": {
            const { data: remoto } = await supabase
              .from("categorias")
              .select("actualizado_en")
              .eq("id", op.entidad_id)
              .single();
            const localActualizado = String(
              (payload as { actualizado_en?: string }).actualizado_en
            );
            if (!remoto || localActualizado > String(remoto.actualizado_en)) {
              await supabase
                .from("categorias")
                .update(payload)
                .eq("id", op.entidad_id);
            }
            break;
          }
          case "CREATE_PRESUPUESTO":
            await supabase.from("presupuestos").upsert(payload);
            break;
          case "UPDATE_PRESUPUESTO": {
            const { data: remoto } = await supabase
              .from("presupuestos")
              .select("actualizado_en")
              .eq("id", op.entidad_id)
              .single();
            const localActualizado = String(
              (payload as { actualizado_en?: string }).actualizado_en
            );
            if (!remoto || localActualizado > String(remoto.actualizado_en)) {
              await supabase
                .from("presupuestos")
                .update(payload)
                .eq("id", op.entidad_id);
            }
            break;
          }
        }
        return { exito: true };
      } catch (err) {
        return { exito: false, error: String(err) };
      }
    },
    [supabase]
  );

  // ── Procesar cola FIFO ────────────────────────────────────────────────────
  const procesarCola = useCallback(async () => {
    if (procesandoRef.current || !estaOnline()) return;
    procesandoRef.current = true;
    setEstadoSync((prev) => ({ ...prev, sincronizando: true }));

    try {
      const db = await getDB();
      const pendientes = await db.getAllFromIndex(
        "cola_sync",
        "by-estado",
        "Pendiente"
      );
      // Ordenar FIFO por creada_en
      pendientes.sort((a, b) => a.creada_en.localeCompare(b.creada_en));

      for (const op of pendientes) {
        if (!estaOnline()) break;

        // Cancelar CREATE_GASTO si el gasto ya fue eliminado localmente
        if (op.tipo === "CREATE_GASTO") {
          const gasto = await db.get("gastos", op.entidad_id);
          if (gasto?.eliminado_en) {
            await db.delete("cola_sync", op.id_operacion);
            continue;
          }
        }

        // Backoff exponencial para reintentos
        if (op.intentos > 0) {
          await esperar(Math.pow(2, op.intentos) * 1000);
        }

        await db.put("cola_sync", { ...op, estado: "Sincronizando" });

        const resultado = await enviarOperacion(op);

        if (resultado.exito) {
          await db.put("cola_sync", { ...op, estado: "Sincronizado", intentos: op.intentos });
          // Actualizar estado_sync en el store de la entidad
          if (op.tipo === "CREATE_GASTO" || op.tipo === "UPDATE_GASTO") {
            const gasto = await db.get("gastos", op.entidad_id);
            if (gasto && !gasto.eliminado_en) {
              await db.put("gastos", { ...gasto, estado_sync: "Sincronizado" });
            }
          }
        } else {
          const nuevosIntentos = op.intentos + 1;
          await db.put("cola_sync", {
            ...op,
            estado: nuevosIntentos >= MAX_INTENTOS ? "Error" : "Pendiente",
            intentos: nuevosIntentos,
            ultimo_error: resultado.error ?? null,
          });
        }
      }
    } finally {
      procesandoRef.current = false;
      setEstadoSync((prev) => ({ ...prev, sincronizando: false }));
      await actualizarContadores();
    }
  }, [enviarOperacion, actualizarContadores]);

  // ── Reintentar errores manualmente ────────────────────────────────────────
  const reintentarErrores = useCallback(async () => {
    const db = await getDB();
    const errores = await db.getAllFromIndex("cola_sync", "by-estado", "Error");
    for (const op of errores) {
      await db.put("cola_sync", { ...op, estado: "Pendiente", intentos: 0 });
    }
    await actualizarContadores();
    if (estaOnline()) procesarCola();
  }, [procesarCola, actualizarContadores]);

  // ── Listeners de red y eventos ────────────────────────────────────────────
  useEffect(() => {
    const onOnline = () => {
      setEstadoSync((prev) => ({ ...prev, online: true }));
      procesarCola();
    };
    const onOffline = () =>
      setEstadoSync((prev) => ({ ...prev, online: false }));
    const onNuevaOp = () => procesarCola();

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("nueva-operacion-encolada", onNuevaOp);

    // Cargar contadores iniciales y procesar pendientes al iniciar
    actualizarContadores();
    if (estaOnline()) procesarCola();

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("nueva-operacion-encolada", onNuevaOp);
    };
  }, [procesarCola, actualizarContadores]);

  return (
    <SyncContext.Provider value={{ estadoSync, encolarOperacion, reintentarErrores }}>
      {children}
    </SyncContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync debe usarse dentro de SyncProvider");
  return ctx;
}
