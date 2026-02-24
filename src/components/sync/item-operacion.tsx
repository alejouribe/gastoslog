"use client";

import { formatearFechaRelativa } from "@/lib/format";
import { formatearCOP } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OperacionSync, TipoOperacion } from "@/types";

interface ItemOperacionProps {
  operacion: OperacionSync;
  onReintentar?: () => void;
  reintentando?: boolean;
}

const TIPO_LABELS: Record<TipoOperacion, string> = {
  CREATE_GASTO: "Crear gasto",
  UPDATE_GASTO: "Actualizar gasto",
  CREATE_CATEGORIA: "Crear categoría",
  UPDATE_CATEGORIA: "Actualizar categoría",
  CREATE_PRESUPUESTO: "Crear presupuesto",
  UPDATE_PRESUPUESTO: "Actualizar presupuesto",
};

const TIPO_ICONOS: Record<TipoOperacion, string> = {
  CREATE_GASTO: "💰",
  UPDATE_GASTO: "✏️",
  CREATE_CATEGORIA: "📂",
  UPDATE_CATEGORIA: "📂",
  CREATE_PRESUPUESTO: "🎯",
  UPDATE_PRESUPUESTO: "🎯",
};

function obtenerDescripcion(op: OperacionSync): string {
  const payload = op.payload as Record<string, unknown>;

  if (op.tipo === "CREATE_GASTO" || op.tipo === "UPDATE_GASTO") {
    const monto = payload.monto_cop as number | undefined;
    if (monto) return formatearCOP(monto);
    if (payload.eliminado_en) return "Eliminado";
  }

  if (op.tipo === "CREATE_CATEGORIA" || op.tipo === "UPDATE_CATEGORIA") {
    return (payload.nombre as string) ?? "";
  }

  if (op.tipo === "CREATE_PRESUPUESTO" || op.tipo === "UPDATE_PRESUPUESTO") {
    const monto = payload.monto_objetivo_cop as number | undefined;
    if (monto) return formatearCOP(monto);
  }

  return op.entidad_id.slice(0, 8);
}

export function ItemOperacion({
  operacion,
  onReintentar,
  reintentando,
}: ItemOperacionProps) {
  const { tipo, estado, creada_en, ultimo_error, intentos } = operacion;

  const estadoColor = {
    Pendiente: "bg-yellow-100 text-yellow-700",
    Sincronizando: "bg-blue-100 text-blue-700",
    Sincronizado: "bg-green-100 text-green-700",
    Error: "bg-red-100 text-red-700",
  }[estado];

  const descripcion = obtenerDescripcion(operacion);

  return (
    <div className="p-4 bg-white rounded-2xl border border-gray-100">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl shrink-0">{TIPO_ICONOS[tipo]}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {TIPO_LABELS[tipo]}
            </p>
            <p className="text-xs text-gray-500 truncate">{descripcion}</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className={cn(
              "px-2 py-0.5 text-xs font-semibold rounded-full",
              estadoColor
            )}
          >
            {estado}
          </span>
          <span className="text-xs text-gray-400">
            {formatearFechaRelativa(creada_en)}
          </span>
        </div>
      </div>

      {estado === "Error" && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {ultimo_error && (
            <p className="text-xs text-red-600 mb-2 line-clamp-2">
              {ultimo_error}
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Intentos: {intentos}/3
            </span>
            {onReintentar && (
              <button
                onClick={onReintentar}
                disabled={reintentando}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-xl",
                  "bg-brand-500 text-white",
                  "hover:bg-brand-600 transition-colors",
                  reintentando && "opacity-50"
                )}
              >
                {reintentando ? "..." : "Reintentar"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ItemOperacionSkeleton() {
  return (
    <div className="p-4 bg-white rounded-2xl border border-gray-100 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200" />
        <div className="flex-1">
          <div className="h-4 w-24 bg-gray-200 rounded mb-1" />
          <div className="h-3 w-16 bg-gray-100 rounded" />
        </div>
        <div className="h-5 w-16 bg-gray-200 rounded-full" />
      </div>
    </div>
  );
}
