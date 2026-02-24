"use client";

import { ItemPresupuesto, ItemPresupuestoSkeleton } from "./item-presupuesto";
import type { PresupuestoConConsumo } from "@/types";

interface ListaPresupuestosProps {
  presupuestos: PresupuestoConConsumo[];
  cargando?: boolean;
}

export function ListaPresupuestos({
  presupuestos,
  cargando,
}: ListaPresupuestosProps) {
  if (cargando) {
    return (
      <div className="flex flex-col gap-3">
        <ItemPresupuestoSkeleton />
        <ItemPresupuestoSkeleton />
        <ItemPresupuestoSkeleton />
      </div>
    );
  }

  const excedidos = presupuestos.filter((p) => p.excedido);
  const normales = presupuestos.filter((p) => !p.excedido);

  return (
    <div className="flex flex-col gap-4">
      {excedidos.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-red-600 uppercase tracking-wide">
            Excedidos ({excedidos.length})
          </h3>
          <div className="flex flex-col gap-3">
            {excedidos.map((p) => (
              <ItemPresupuesto key={p.id} presupuesto={p} />
            ))}
          </div>
        </div>
      )}

      {normales.length > 0 && (
        <div className="flex flex-col gap-3">
          {excedidos.length > 0 && (
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              En progreso ({normales.length})
            </h3>
          )}
          <div className="flex flex-col gap-3">
            {normales.map((p) => (
              <ItemPresupuesto key={p.id} presupuesto={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
