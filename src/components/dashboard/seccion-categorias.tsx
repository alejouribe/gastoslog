"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatearCOP, formatearPorcentaje } from "@/lib/format";
import { COLOR_DOT, COLOR_CLASES } from "@/services/categoria-service";
import type { GastoCategoria, Periodo } from "@/types";

interface SeccionCategoriasProps {
  categorias: GastoCategoria[];
  periodo: Periodo;
  maxCategorias?: number;
}

export function SeccionCategorias({
  categorias,
  periodo,
  maxCategorias = 5,
}: SeccionCategoriasProps) {
  const router = useRouter();

  if (categorias.length === 0) {
    return null;
  }

  const categoriasVisibles = categorias.slice(0, maxCategorias);
  const maxMonto = Math.max(...categoriasVisibles.map((c) => c.total_cop));

  const handleClickCategoria = (categoriaId: string) => {
    const params = new URLSearchParams({
      categoria_id: categoriaId,
      periodo,
    });
    router.push(`/app/historial?${params.toString()}`);
  };

  return (
    <div className="rounded-3xl bg-white border border-gray-100 p-5">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
        Por categoría
      </h2>
      <div className="space-y-3">
        {categoriasVisibles.map((cat) => {
          const dotColor = COLOR_DOT[cat.categoria_color ?? "gray"] ?? COLOR_DOT["gray"];
          const barColor = cat.categoria_color
            ? `bg-${cat.categoria_color}-400`
            : "bg-gray-400";
          const porcentajeBarra = maxMonto > 0 ? (cat.total_cop / maxMonto) * 100 : 0;

          return (
            <button
              key={cat.categoria_id}
              type="button"
              onClick={() => handleClickCategoria(cat.categoria_id)}
              className={cn(
                "w-full text-left p-3 rounded-2xl transition-colors",
                "hover:bg-gray-50 active:bg-gray-100",
                "focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={cn("w-3 h-3 rounded-full flex-shrink-0", dotColor)} />
                  <span className="font-medium text-gray-800 text-sm">
                    {cat.categoria_nombre}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-gray-900 text-sm">
                    {formatearCOP(cat.total_cop)}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    {formatearPorcentaje(cat.porcentaje)}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", barColor)}
                  style={{ width: `${porcentajeBarra}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {categorias.length > maxCategorias && (
        <p className="text-xs text-gray-400 text-center mt-3">
          +{categorias.length - maxCategorias} categorías más
        </p>
      )}
    </div>
  );
}

export function SeccionCategoriasSkeleton() {
  return (
    <div className="rounded-3xl bg-white border border-gray-100 p-5 animate-pulse">
      <div className="h-4 w-24 bg-gray-200 rounded mb-4" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="flex justify-between mb-2">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-4 w-16 bg-gray-200 rounded" />
            </div>
            <div className="h-2 bg-gray-100 rounded-full">
              <div
                className="h-full bg-gray-300 rounded-full"
                style={{ width: `${80 - i * 20}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
