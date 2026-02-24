"use client";

import Link from "next/link";
import { formatearMes } from "@/lib/format";

interface EstadoVacioPresupuestosProps {
  mes: string;
}

export function EstadoVacioPresupuestos({ mes }: EstadoVacioPresupuestosProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
          />
        </svg>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        Sin presupuestos
      </h3>
      <p className="text-sm text-gray-500 text-center mb-6 max-w-[280px]">
        No tienes presupuestos para {formatearMes(mes).toLowerCase()}. Crea uno
        para controlar tus gastos.
      </p>

      <Link
        href={`/app/presupuestos/nuevo?mes=${mes}`}
        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-brand-500 text-white font-semibold transition-all hover:bg-brand-600 active:scale-[0.98]"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Crear presupuesto
      </Link>
    </div>
  );
}
