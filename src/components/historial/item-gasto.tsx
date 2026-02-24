"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatearCOP } from "@/lib/format";
import { formatearFechaRelativa } from "@/lib/format";
import { COLOR_DOT } from "@/services/categoria-service";
import { BadgeSync } from "@/components/ui/badge-sync";
import type { Gasto, Categoria } from "@/types";

interface ItemGastoProps {
  gasto: Gasto;
  categoria: Categoria | undefined;
}

export function ItemGasto({ gasto, categoria }: ItemGastoProps) {
  const dotColor = COLOR_DOT[categoria?.color ?? "gray"] ?? COLOR_DOT["gray"];
  const fechaRelativa = formatearFechaRelativa(gasto.fecha_hora);
  const notaTruncada = gasto.nota
    ? gasto.nota.length > 60
      ? gasto.nota.slice(0, 60) + "…"
      : gasto.nota
    : null;

  return (
    <Link
      href={`/app/gastos/${gasto.id}`}
      className={cn(
        "flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100",
        "hover:bg-gray-50 active:bg-gray-100 transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-brand-500/30"
      )}
    >
      <div className={cn("w-3 h-3 rounded-full flex-shrink-0", dotColor)} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="font-semibold text-gray-900 text-sm">
            {formatearCOP(gasto.monto_cop)}
          </span>
          <span className="text-xs text-gray-400">{fechaRelativa}</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="truncate">{categoria?.nombre ?? "Sin categoría"}</span>
          <span>•</span>
          <span>{gasto.metodo_de_pago}</span>
        </div>

        {notaTruncada && (
          <p className="text-xs text-gray-400 mt-1 truncate">{notaTruncada}</p>
        )}
      </div>

      {gasto.estado_sync !== "Sincronizado" && (
        <BadgeSync estado={gasto.estado_sync} />
      )}

      <svg
        className="w-4 h-4 text-gray-400 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

export function ItemGastoSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 animate-pulse">
      <div className="w-3 h-3 rounded-full bg-gray-200" />
      <div className="flex-1">
        <div className="flex justify-between mb-2">
          <div className="h-4 w-20 bg-gray-200 rounded" />
          <div className="h-3 w-16 bg-gray-200 rounded" />
        </div>
        <div className="h-3 w-32 bg-gray-200 rounded" />
      </div>
    </div>
  );
}
