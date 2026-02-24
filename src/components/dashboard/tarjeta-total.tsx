"use client";

import { cn } from "@/lib/utils";
import { formatearCOP } from "@/lib/format";
import { dashboardService } from "@/services/dashboard-service";
import type { AgregadosDashboard } from "@/types";

interface TarjetaTotalPeriodoProps {
  agregados: AgregadosDashboard;
}

export function TarjetaTotalPeriodo({ agregados }: TarjetaTotalPeriodoProps) {
  const rangoTexto = dashboardService.formatearRangoPeriodo(
    agregados.rango,
    agregados.periodo
  );

  return (
    <div className="rounded-3xl bg-gradient-to-br from-brand-500 to-brand-600 text-white p-6 shadow-lg shadow-brand-500/30">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-white/80">
            Total {agregados.periodo.toLowerCase()}
          </p>
          <p className="text-4xl font-extrabold mt-1 tracking-tight">
            {formatearCOP(agregados.total_periodo_cop)}
          </p>
        </div>
        {agregados.tiene_pendientes && (
          <BadgePendientes />
        )}
      </div>
      <p className="text-xs text-white/60 mt-3 capitalize">{rangoTexto}</p>
    </div>
  );
}

function BadgePendientes() {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full",
        "bg-white/20 backdrop-blur-sm",
        "text-xs font-medium text-white"
      )}
      title="Incluye gastos pendientes de sincronización"
    >
      <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
      Pendientes
    </div>
  );
}

interface TarjetaTotalSkeletonProps {
  className?: string;
}

export function TarjetaTotalSkeleton({ className }: TarjetaTotalSkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-3xl bg-gradient-to-br from-brand-400 to-brand-500 p-6 animate-pulse",
        className
      )}
    >
      <div className="h-4 w-20 bg-white/30 rounded mb-3" />
      <div className="h-10 w-40 bg-white/30 rounded mb-4" />
      <div className="h-3 w-32 bg-white/20 rounded" />
    </div>
  );
}
