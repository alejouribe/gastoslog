"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { usePresupuestos } from "@/hooks/use-presupuestos";
import { usePreferencias } from "@/contexts/preferencias-context";
import {
  SelectorMes,
  ListaPresupuestos,
  EstadoVacioPresupuestos,
} from "@/components/presupuestos";
import { mesActual } from "@/lib/periodos";
import { formatearCOP } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function PaginaPresupuestos() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { preferencias } = usePreferencias();

  const mesParam = searchParams.get("mes");
  const [mes, setMes] = useState(mesParam || mesActual(preferencias.zona_horaria));

  const { presupuestos, cargando, error } = usePresupuestos(mes);

  useEffect(() => {
    if (mesParam) {
      setMes(mesParam);
    }
  }, [mesParam]);

  const handleChangeMes = (nuevoMes: string) => {
    setMes(nuevoMes);
    const url = new URL(window.location.href);
    url.searchParams.set("mes", nuevoMes);
    router.replace(url.pathname + url.search, { scroll: false });
  };

  const totalObjetivo = presupuestos.reduce((acc, p) => acc + p.monto_objetivo_cop, 0);
  const totalConsumido = presupuestos.reduce((acc, p) => acc + p.monto_consumido_cop, 0);
  const porcentajeTotal = totalObjetivo > 0 ? (totalConsumido / totalObjetivo) * 100 : 0;
  const excedenTotal = presupuestos.filter((p) => p.excedido).length;

  return (
    <div className="px-4 py-6 safe-area-pt pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Presupuestos</h1>
        <Link
          href={`/app/presupuestos/nuevo?mes=${mes}`}
          className={cn(
            "p-2 rounded-xl bg-brand-500 text-white",
            "hover:bg-brand-600 transition-colors"
          )}
          aria-label="Crear presupuesto"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </Link>
      </div>

      <div className="mb-6">
        <SelectorMes
          mes={mes}
          onChange={handleChangeMes}
          disabled={cargando}
          zonaHoraria={preferencias.zona_horaria}
        />
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700 mb-6">
          {error}
        </div>
      )}

      {!cargando && presupuestos.length > 0 && (
        <div className="p-4 rounded-2xl bg-white border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Resumen del mes</span>
            {excedenTotal > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                {excedenTotal} excedido{excedenTotal > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-2xl font-bold text-gray-900">
              {formatearCOP(totalConsumido)}
            </span>
            <span className="text-sm text-gray-500">
              de {formatearCOP(totalObjetivo)}
            </span>
          </div>
          <div className="relative h-2 rounded-full overflow-hidden bg-gray-100">
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-all",
                porcentajeTotal > 100
                  ? "bg-red-500"
                  : porcentajeTotal >= 80
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              )}
              style={{ width: `${Math.min(porcentajeTotal, 100)}%` }}
            />
          </div>
        </div>
      )}

      {cargando ? (
        <ListaPresupuestos presupuestos={[]} cargando />
      ) : presupuestos.length === 0 ? (
        <EstadoVacioPresupuestos mes={mes} />
      ) : (
        <ListaPresupuestos presupuestos={presupuestos} />
      )}
    </div>
  );
}
