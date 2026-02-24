"use client";

import { useState } from "react";
import Link from "next/link";
import { useDashboard } from "@/hooks/use-dashboard";
import {
  SelectorPeriodo,
  TarjetaTotalPeriodo,
  TarjetaTotalSkeleton,
  SeccionCategorias,
  SeccionCategoriasSkeleton,
  GraficoSerieTemporal,
  GraficoSerieTemporalSkeleton,
  EstadoVacioDashboard,
} from "@/components/dashboard";
import { cn } from "@/lib/utils";
import type { Periodo } from "@/types";

export default function PaginaDashboard() {
  const [periodo, setPeriodo] = useState<Periodo>("Hoy");
  const { agregados, cargando, error } = useDashboard(periodo);

  const tieneGastos = agregados && agregados.total_periodo_cop > 0;

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="px-4 pt-6 pb-4 safe-area-pt">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">GastoLog</h1>
            <p className="text-sm text-gray-500 mt-0.5">¿En qué gastas hoy?</p>
          </div>
          <Link
            href="/app/registrar"
            className={cn(
              "flex items-center justify-center w-12 h-12 rounded-2xl",
              "bg-brand-600 text-white shadow-lg shadow-brand-600/30",
              "hover:bg-brand-700 transition-colors"
            )}
            aria-label="Registrar gasto"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </Link>
        </div>

        <SelectorPeriodo
          valor={periodo}
          onChange={setPeriodo}
          disabled={cargando}
        />
      </header>

      <main className="flex-1 px-4 pb-6 flex flex-col gap-4">
        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-center">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {cargando ? (
          <>
            <TarjetaTotalSkeleton />
            <SeccionCategoriasSkeleton />
            <GraficoSerieTemporalSkeleton />
          </>
        ) : agregados && tieneGastos ? (
          <>
            <TarjetaTotalPeriodo agregados={agregados} />
            <SeccionCategorias
              categorias={agregados.gasto_por_categoria}
              periodo={periodo}
            />
            <GraficoSerieTemporal datos={agregados.gasto_por_dia} />
          </>
        ) : (
          <>
            <div className="rounded-3xl bg-gradient-to-br from-brand-500 to-brand-600 text-white p-6 shadow-lg shadow-brand-500/30">
              <p className="text-sm font-medium text-white/80">
                Total {periodo.toLowerCase()}
              </p>
              <p className="text-4xl font-extrabold mt-1">$0</p>
            </div>
            <EstadoVacioDashboard periodo={periodo} />
          </>
        )}
      </main>
    </div>
  );
}
