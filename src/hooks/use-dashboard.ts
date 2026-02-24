"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { dashboardService } from "@/services/dashboard-service";
import { useAuth } from "@/contexts/auth-context";
import { usePreferencias } from "@/contexts/preferencias-context";
import { getDB } from "@/lib/db";
import type { Periodo, AgregadosDashboard, Gasto, Categoria } from "@/types";

export function useDashboard(periodo: Periodo) {
  const { usuario } = useAuth();
  const { preferencias } = usePreferencias();
  const [agregados, setAgregados] = useState<AgregadosDashboard | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculoIdRef = useRef(0);

  const calcular = useCallback(async () => {
    if (!usuario) {
      setCargando(false);
      return;
    }

    const calculoId = ++calculoIdRef.current;
    setCargando(true);
    setError(null);

    try {
      const db = await getDB();

      const [allGastos, allCategorias] = await Promise.all([
        db.getAll("gastos"),
        db.getAll("categorias"),
      ]);

      const gastos = allGastos.filter((g) => g.usuario_id === usuario.id);
      const categorias = allCategorias.filter((c) => c.usuario_id === usuario.id);

      if (calculoId !== calculoIdRef.current) return;

      const prefs = {
        zona_horaria: preferencias.zona_horaria,
        semana_inicia_en: preferencias.semana_inicia_en,
      };

      const rango = dashboardService.calcularRangoPeriodo(periodo, prefs);
      const resultado = dashboardService.calcularAgregados(
        gastos,
        categorias,
        periodo,
        rango,
        prefs
      );

      if (calculoId !== calculoIdRef.current) return;

      setAgregados(resultado);
    } catch (err) {
      if (calculoId !== calculoIdRef.current) return;
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      if (calculoId === calculoIdRef.current) {
        setCargando(false);
      }
    }
  }, [usuario, periodo, preferencias.zona_horaria, preferencias.semana_inicia_en]);

  useEffect(() => {
    calcular();
  }, [calcular]);

  useEffect(() => {
    const handleGastoCreado = () => {
      calcular();
    };

    window.addEventListener("gasto-creado", handleGastoCreado);
    window.addEventListener("gasto-actualizado", handleGastoCreado);
    window.addEventListener("sync-completado", handleGastoCreado);

    return () => {
      window.removeEventListener("gasto-creado", handleGastoCreado);
      window.removeEventListener("gasto-actualizado", handleGastoCreado);
      window.removeEventListener("sync-completado", handleGastoCreado);
    };
  }, [calcular]);

  return {
    agregados,
    cargando,
    error,
    recargar: calcular,
  };
}
