"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { presupuestoService } from "@/services/presupuesto-service";
import { useAuth } from "@/contexts/auth-context";
import { usePreferencias } from "@/contexts/preferencias-context";
import type { PresupuestoConConsumo } from "@/types";

export function usePresupuestos(mes: string) {
  const { usuario } = useAuth();
  const { preferencias } = usePreferencias();
  const [presupuestos, setPresupuestos] = useState<PresupuestoConConsumo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mesRef = useRef(mes);
  mesRef.current = mes;

  const cargar = useCallback(async () => {
    if (!usuario) {
      setCargando(false);
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const resultado = await presupuestoService.calcularConsumos(
        usuario.id,
        mesRef.current,
        preferencias.zona_horaria
      );

      const ordenados = resultado.sort((a, b) => {
        if (a.excedido && !b.excedido) return -1;
        if (!a.excedido && b.excedido) return 1;
        return b.porcentaje_consumo - a.porcentaje_consumo;
      });

      setPresupuestos(ordenados);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar presupuestos");
    } finally {
      setCargando(false);
    }
  }, [usuario, preferencias.zona_horaria]);

  useEffect(() => {
    cargar();
  }, [cargar, mes]);

  useEffect(() => {
    const handleActualizacion = () => {
      cargar();
    };

    window.addEventListener("gasto-creado", handleActualizacion);
    window.addEventListener("gasto-actualizado", handleActualizacion);
    window.addEventListener("gasto-eliminado", handleActualizacion);
    window.addEventListener("presupuesto-creado", handleActualizacion);
    window.addEventListener("presupuesto-actualizado", handleActualizacion);

    return () => {
      window.removeEventListener("gasto-creado", handleActualizacion);
      window.removeEventListener("gasto-actualizado", handleActualizacion);
      window.removeEventListener("gasto-eliminado", handleActualizacion);
      window.removeEventListener("presupuesto-creado", handleActualizacion);
      window.removeEventListener("presupuesto-actualizado", handleActualizacion);
    };
  }, [cargar]);

  return {
    presupuestos,
    cargando,
    error,
    recargar: cargar,
  };
}
