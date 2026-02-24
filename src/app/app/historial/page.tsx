"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useHistorial } from "@/hooks/use-historial";
import { useCategorias } from "@/hooks/use-categorias";
import { usePreferencias } from "@/contexts/preferencias-context";
import {
  BarraBusqueda,
  ListaGastos,
  PanelFiltros,
  EstadoVacioHistorial,
} from "@/components/historial";
import { calcularRango } from "@/lib/periodos";
import type { FiltrosHistorial, Periodo } from "@/types";

export default function PaginaHistorial() {
  const searchParams = useSearchParams();
  const { preferencias } = usePreferencias();
  const { categorias, cargando: cargandoCategorias } = useCategorias({ incluirInactivas: true });

  const [filtros, setFiltros] = useState<FiltrosHistorial>(() => {
    const categoriaId = searchParams.get("categoria_id") ?? undefined;
    const periodoParam = searchParams.get("periodo") as Periodo | null;
    let fechaDesde = searchParams.get("fecha_desde") ?? undefined;
    let fechaHasta = searchParams.get("fecha_hasta") ?? undefined;

    if (periodoParam && !fechaDesde && !fechaHasta) {
      const rango = calcularRango(
        periodoParam,
        preferencias.zona_horaria,
        preferencias.semana_inicia_en
      );
      fechaDesde = rango.desde.toISOString().split("T")[0];
      fechaHasta = rango.hasta.toISOString().split("T")[0];
    }

    return {
      categoria_id: categoriaId,
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta,
      texto: undefined,
    };
  });

  const {
    gastos,
    cargando,
    cargandoMas,
    hayMas,
    cargarMas,
    totalFiltrado,
    error,
  } = useHistorial(filtros);

  const handleBusquedaChange = useCallback((texto: string) => {
    setFiltros((prev) => ({
      ...prev,
      texto: texto || undefined,
    }));
  }, []);

  const handleFiltrosChange = useCallback((nuevosFiltros: FiltrosHistorial) => {
    setFiltros(nuevosFiltros);
  }, []);

  const handleLimpiarFiltros = useCallback(() => {
    setFiltros({
      categoria_id: undefined,
      fecha_desde: undefined,
      fecha_hasta: undefined,
      texto: undefined,
    });
  }, []);

  const tieneFiltros = useMemo(
    () =>
      !!(
        filtros.categoria_id ||
        filtros.fecha_desde ||
        filtros.fecha_hasta ||
        filtros.texto
      ),
    [filtros]
  );

  const mostrarEstadoVacio = !cargando && gastos.length === 0;

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="px-4 pt-6 pb-4 safe-area-pt">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Historial</h1>
        <BarraBusqueda
          valor={filtros.texto ?? ""}
          onChange={handleBusquedaChange}
          disabled={cargando && gastos.length === 0}
        />
      </header>

      <main className="flex-1 px-4 flex flex-col gap-4">
        <PanelFiltros
          filtros={filtros}
          categorias={categorias}
          onFiltrosChange={handleFiltrosChange}
          disabled={cargandoCategorias}
        />

        {!cargando && gastos.length > 0 && (
          <p className="text-xs text-gray-500">
            {totalFiltrado} {totalFiltrado === 1 ? "gasto" : "gastos"}
            {tieneFiltros && " con los filtros aplicados"}
          </p>
        )}

        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-center">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {mostrarEstadoVacio ? (
          <EstadoVacioHistorial
            tieneFiltros={tieneFiltros}
            onLimpiarFiltros={tieneFiltros ? handleLimpiarFiltros : undefined}
          />
        ) : (
          <ListaGastos
            gastos={gastos}
            categorias={categorias}
            cargando={cargando}
            cargandoMas={cargandoMas}
            hayMas={hayMas}
            onCargarMas={cargarMas}
          />
        )}
      </main>
    </div>
  );
}
