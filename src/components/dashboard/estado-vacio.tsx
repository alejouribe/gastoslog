"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Periodo } from "@/types";

interface EstadoVacioDashboardProps {
  periodo: Periodo;
}

const TEXTOS_PERIODO: Record<Periodo, string> = {
  Hoy: "hoy",
  Semana: "esta semana",
  Mes: "este mes",
};

export function EstadoVacioDashboard({ periodo }: EstadoVacioDashboardProps) {
  return (
    <div className="rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 p-8 text-center">
      <div className="text-5xl mb-4">💰</div>
      <h3 className="font-semibold text-gray-800 text-lg mb-2">
        Sin gastos {TEXTOS_PERIODO[periodo]}
      </h3>
      <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
        Registra tu primer gasto para empezar a ver tus métricas y entender en qué gastas.
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
