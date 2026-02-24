"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { gastoService } from "@/services/gasto-service";
import { useAuth } from "@/contexts/auth-context";
import type { Gasto, FiltrosHistorial } from "@/types";

const PAGE_SIZE = 20;

export function useHistorial(filtros: FiltrosHistorial) {
  const { usuario } = useAuth();
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [hayMas, setHayMas] = useState(false);
  const [totalFiltrado, setTotalFiltrado] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const filtrosRef = useRef(filtros);
  filtrosRef.current = filtros;

  const cargarInicial = useCallback(async () => {
    if (!usuario) {
      setCargando(false);
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const resultado = await gastoService.listarFiltrado(
        usuario.id,
        filtrosRef.current,
        { limite: PAGE_SIZE }
      );

      setGastos(resultado.gastos);
      setHayMas(resultado.hayMas);
      setTotalFiltrado(resultado.totalFiltrado);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar historial");
    } finally {
      setCargando(false);
    }
  }, [usuario]);

  const cargarMas = useCallback(async () => {
    if (!usuario || cargandoMas || !hayMas || gastos.length === 0) return;

    setCargandoMas(true);

    try {
      const ultimoGasto = gastos[gastos.length - 1];
      const resultado = await gastoService.listarFiltrado(
        usuario.id,
        filtrosRef.current,
        { limite: PAGE_SIZE, cursor: ultimoGasto.fecha_hora }
      );

      setGastos((prev) => [...prev, ...resultado.gastos]);
      setHayMas(resultado.hayMas);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar más gastos");
    } finally {
      setCargandoMas(false);
    }
  }, [usuario, cargandoMas, hayMas, gastos]);

  useEffect(() => {
    cargarInicial();
  }, [cargarInicial, filtros.categoria_id, filtros.fecha_desde, filtros.fecha_hasta, filtros.texto]);

  useEffect(() => {
    const handleGastoActualizado = () => {
      cargarInicial();
    };

    window.addEventListener("gasto-creado", handleGastoActualizado);
    window.addEventListener("gasto-actualizado", handleGastoActualizado);
    window.addEventListener("gasto-eliminado", handleGastoActualizado);

    return () => {
      window.removeEventListener("gasto-creado", handleGastoActualizado);
      window.removeEventListener("gasto-actualizado", handleGastoActualizado);
      window.removeEventListener("gasto-eliminado", handleGastoActualizado);
    };
  }, [cargarInicial]);

  return {
    gastos,
    cargando,
    cargandoMas,
    hayMas,
    cargarMas,
    totalFiltrado,
    error,
    recargar: cargarInicial,
  };
}
