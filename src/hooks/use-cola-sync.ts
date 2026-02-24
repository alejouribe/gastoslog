"use client";

import { useState, useEffect, useCallback } from "react";
import { getDB } from "@/lib/db";
import { useSync } from "@/contexts/sync-context";
import type { OperacionSync, EstadoOperacion } from "@/types";

type FiltroEstado = "todos" | EstadoOperacion;

export function useColaSync(filtro: FiltroEstado = "todos") {
  const { reintentarErrores } = useSync();
  const [operaciones, setOperaciones] = useState<OperacionSync[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const db = await getDB();
      let ops: OperacionSync[];

      if (filtro === "todos") {
        ops = await db.getAll("cola_sync");
      } else {
        ops = await db.getAllFromIndex("cola_sync", "by-estado", filtro);
      }

      ops.sort((a, b) => b.creada_en.localeCompare(a.creada_en));
      setOperaciones(ops);
    } catch {
      setOperaciones([]);
    } finally {
      setCargando(false);
    }
  }, [filtro]);

  useEffect(() => {
    cargar();

    const handleSync = () => {
      setTimeout(cargar, 500);
    };

    window.addEventListener("nueva-operacion-encolada", handleSync);
    window.addEventListener("online", handleSync);

    return () => {
      window.removeEventListener("nueva-operacion-encolada", handleSync);
      window.removeEventListener("online", handleSync);
    };
  }, [cargar]);

  const reintentarOperacion = useCallback(async (idOperacion: string) => {
    const db = await getDB();
    const op = await db.get("cola_sync", idOperacion);
    if (op && op.estado === "Error") {
      await db.put("cola_sync", { ...op, estado: "Pendiente", intentos: 0 });
      window.dispatchEvent(new CustomEvent("nueva-operacion-encolada"));
      await cargar();
    }
  }, [cargar]);

  const reintentarTodo = useCallback(async () => {
    await reintentarErrores();
    await cargar();
  }, [reintentarErrores, cargar]);

  const limpiarSincronizadas = useCallback(async () => {
    const db = await getDB();
    const sincronizadas = await db.getAllFromIndex(
      "cola_sync",
      "by-estado",
      "Sincronizado"
    );
    const tx = db.transaction("cola_sync", "readwrite");
    for (const op of sincronizadas) {
      await tx.store.delete(op.id_operacion);
    }
    await tx.done;
    await cargar();
  }, [cargar]);

  const contadores = {
    pendientes: operaciones.filter((o) => o.estado === "Pendiente").length,
    sincronizando: operaciones.filter((o) => o.estado === "Sincronizando").length,
    sincronizados: operaciones.filter((o) => o.estado === "Sincronizado").length,
    errores: operaciones.filter((o) => o.estado === "Error").length,
  };

  return {
    operaciones,
    contadores,
    cargando,
    recargar: cargar,
    reintentarOperacion,
    reintentarTodo,
    limpiarSincronizadas,
  };
}
