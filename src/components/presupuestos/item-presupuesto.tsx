"use client";

import Link from "next/link";
import { BarraProgreso } from "./barra-progreso";
import { formatearCOP, formatearPorcentaje } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PresupuestoConConsumo } from "@/types";

interface ItemPresupuestoProps {
  presupuesto: PresupuestoConConsumo;
}

export function ItemPresupuesto({ presupuesto }: ItemPresupuestoProps) {
  const {
    id,
    categoria_nombre,
    categoria_color,
    monto_objetivo_cop,
    monto_consumido_cop,
    porcentaje_consumo,
    excedido,
  } = presupuesto;

  return (
    <Link
      href={`/app/presupuestos/${id}`}
      className={cn(
        "block p-4 rounded-2xl border transition-all",
        "hover:shadow-md active:scale-[0.99]",
        excedido
          ? "border-red-200 bg-red-50/50"
          : "border-gray-100 bg-white"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {categoria_color && (
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: categoria_color }}
            />
          )}
          <span className="font-medium text-gray-900 truncate max-w-[180px]">
            {categoria_nombre}
          </span>
        </div>

        {excedido && (
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">
            Excedido
          </span>
        )}
      </div>

      <BarraProgreso
        porcentaje={porcentaje_consumo}
        excedido={excedido}
        className="mb-2"
      />

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">
          {formatearCOP(monto_consumido_cop)}
          <span className="text-gray-400"> / {formatearCOP(monto_objetivo_cop)}</span>
        </span>
        <span
          className={cn(
            "font-semibold",
            excedido
              ? "text-red-600"
              : porcentaje_consumo >= 80
                ? "text-amber-600"
                : "text-emerald-600"
          )}
        >
          {formatearPorcentaje(porcentaje_consumo)}
        </span>
      </div>
    </Link>
  );
}

export function ItemPresupuestoSkeleton() {
  return (
    <div className="p-4 rounded-2xl border border-gray-100 bg-white animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full bg-gray-200" />
        <div className="h-5 w-32 rounded bg-gray-200" />
      </div>
      <div className="h-3 rounded-full bg-gray-100 mb-2" />
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 rounded bg-gray-200" />
        <div className="h-4 w-12 rounded bg-gray-200" />
      </div>
    </div>
  );
}
