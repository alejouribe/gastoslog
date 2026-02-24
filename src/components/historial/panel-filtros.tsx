"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { COLOR_DOT } from "@/services/categoria-service";
import type { Categoria, FiltrosHistorial } from "@/types";

interface PanelFiltrosProps {
  filtros: FiltrosHistorial;
  categorias: Categoria[];
  onFiltrosChange: (filtros: FiltrosHistorial) => void;
  disabled?: boolean;
}

export function PanelFiltros({
  filtros,
  categorias,
  onFiltrosChange,
  disabled,
}: PanelFiltrosProps) {
  const [expandido, setExpandido] = useState(
    !!(filtros.categoria_id || filtros.fecha_desde || filtros.fecha_hasta)
  );

  const tieneFiltros = !!(
    filtros.categoria_id ||
    filtros.fecha_desde ||
    filtros.fecha_hasta
  );

  const handleCategoriaChange = (categoriaId: string | undefined) => {
    onFiltrosChange({ ...filtros, categoria_id: categoriaId });
  };

  const handleFechaDesdeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltrosChange({ ...filtros, fecha_desde: e.target.value || undefined });
  };

  const handleFechaHastaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltrosChange({ ...filtros, fecha_hasta: e.target.value || undefined });
  };

  const handleLimpiar = () => {
    onFiltrosChange({
      ...filtros,
      categoria_id: undefined,
      fecha_desde: undefined,
      fecha_hasta: undefined,
    });
  };

  const categoriaSeleccionada = categorias.find(
    (c) => c.id === filtros.categoria_id
  );

  return (
    <div className="rounded-2xl bg-white border border-gray-100">
      <button
        type="button"
        onClick={() => setExpandido(!expandido)}
        className={cn(
          "w-full flex items-center justify-between p-4",
          "text-sm font-semibold text-gray-700"
        )}
      >
        <span className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filtros
          {tieneFiltros && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-brand-100 text-brand-700">
              Activos
            </span>
          )}
        </span>
        <svg
          className={cn(
            "w-5 h-5 text-gray-400 transition-transform",
            expandido && "rotate-180"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expandido && (
        <div className="px-4 pb-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Categoría
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleCategoriaChange(undefined)}
                disabled={disabled}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  !filtros.categoria_id
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                Todas
              </button>
              {categorias.map((cat) => {
                const dotColor = COLOR_DOT[cat.color ?? "gray"] ?? COLOR_DOT["gray"];
                const seleccionada = filtros.categoria_id === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoriaChange(cat.id)}
                    disabled={disabled}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                      seleccionada
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                      disabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <span className={cn("w-2 h-2 rounded-full", seleccionada ? "bg-white" : dotColor)} />
                    {cat.nombre}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="fecha-desde"
                className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2"
              >
                Desde
              </label>
              <input
                id="fecha-desde"
                type="date"
                value={filtros.fecha_desde ?? ""}
                onChange={handleFechaDesdeChange}
                disabled={disabled}
                className={cn(
                  "w-full px-3 py-2 rounded-xl border-2 border-gray-200 text-sm",
                  "focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              />
            </div>
            <div>
              <label
                htmlFor="fecha-hasta"
                className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2"
              >
                Hasta
              </label>
              <input
                id="fecha-hasta"
                type="date"
                value={filtros.fecha_hasta ?? ""}
                onChange={handleFechaHastaChange}
                disabled={disabled}
                className={cn(
                  "w-full px-3 py-2 rounded-xl border-2 border-gray-200 text-sm",
                  "focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              />
            </div>
          </div>

          {tieneFiltros && (
            <button
              type="button"
              onClick={handleLimpiar}
              disabled={disabled}
              className={cn(
                "w-full py-2 rounded-xl text-sm font-medium",
                "text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}
