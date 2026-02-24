"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface EstadoVacioHistorialProps {
  tieneFiltros: boolean;
  onLimpiarFiltros?: () => void;
}

export function EstadoVacioHistorial({
  tieneFiltros,
  onLimpiarFiltros,
}: EstadoVacioHistorialProps) {
  if (tieneFiltros) {
    return (
      <div className="rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 p-8 text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h3 className="font-semibold text-gray-800 text-lg mb-2">
          Sin resultados
        </h3>
        <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
          No encontramos gastos que coincidan con tus filtros o búsqueda.
        </p>
        {onLimpiarFiltros && (
          <button
            type="button"
            onClick={onLimpiarFiltros}
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl",
              "bg-gray-900 text-white font-semibold text-sm",
              "hover:bg-gray-800 transition-colors"
            )}
          >
            Limpiar filtros
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 p-8 text-center">
      <div className="text-4xl mb-4">📋</div>
      <h3 className="font-semibold text-gray-800 text-lg mb-2">
        Sin gastos registrados
      </h3>
      <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
        Aún no tienes gastos en tu historial. Registra tu primer gasto para empezar.
      </p>
      <Link
        href="/app/registrar"
        className={cn(
          "inline-flex items-center gap-2 px-6 py-3 rounded-2xl",
          "bg-brand-600 text-white font-semibold text-sm",
          "hover:bg-brand-700 transition-colors",
          "shadow-md shadow-brand-600/20"
        )}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Registrar gasto
      </Link>
    </div>
  );
}
