"use client";

import { cn } from "@/lib/utils";
import { formatearMes } from "@/lib/format";
import { mesActual } from "@/lib/periodos";

interface SelectorMesProps {
  mes: string;
  onChange: (mes: string) => void;
  disabled?: boolean;
  zonaHoraria?: string;
}

function mesAnterior(mes: string): string {
  const [anio, mesNum] = mes.split("-").map(Number);
  if (mesNum === 1) {
    return `${anio - 1}-12`;
  }
  return `${anio}-${String(mesNum - 1).padStart(2, "0")}`;
}

function mesSiguiente(mes: string): string {
  const [anio, mesNum] = mes.split("-").map(Number);
  if (mesNum === 12) {
    return `${anio + 1}-01`;
  }
  return `${anio}-${String(mesNum + 1).padStart(2, "0")}`;
}

export function SelectorMes({
  mes,
  onChange,
  disabled,
  zonaHoraria = "America/Bogota",
}: SelectorMesProps) {
  const mesActualStr = mesActual(zonaHoraria);
  const puedeAvanzar = mes < mesActualStr;

  return (
    <div className="flex items-center justify-between gap-4">
      <button
        type="button"
        onClick={() => onChange(mesAnterior(mes))}
        disabled={disabled}
        className={cn(
          "p-2 rounded-xl transition-colors",
          "hover:bg-gray-100 active:bg-gray-200",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        aria-label="Mes anterior"
      >
        <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <span className="text-lg font-semibold text-gray-900 capitalize">
        {formatearMes(mes)}
      </span>

      <button
        type="button"
        onClick={() => onChange(mesSiguiente(mes))}
        disabled={disabled || !puedeAvanzar}
        className={cn(
          "p-2 rounded-xl transition-colors",
          "hover:bg-gray-100 active:bg-gray-200",
          (disabled || !puedeAvanzar) && "opacity-50 cursor-not-allowed"
        )}
        aria-label="Mes siguiente"
      >
        <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

interface SelectorMesFormProps {
  valor: string;
  onChange: (mes: string) => void;
  disabled?: boolean;
  zonaHoraria?: string;
}

export function SelectorMesForm({
  valor,
  onChange,
  disabled,
  zonaHoraria = "America/Bogota",
}: SelectorMesFormProps) {
  const mesActualStr = mesActual(zonaHoraria);

  const meses: string[] = [];
  let cursor = mesActualStr;
  for (let i = 0; i < 12; i++) {
    meses.push(cursor);
    cursor = mesAnterior(cursor);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="selector-mes" className="text-sm font-semibold text-gray-700">
        Mes
      </label>
      <select
        id="selector-mes"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "w-full px-4 py-3 rounded-2xl border-2 border-gray-200 bg-white text-gray-900",
          "focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500",
          "transition-all capitalize",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {meses.map((m) => (
          <option key={m} value={m} className="capitalize">
            {formatearMes(m)}
          </option>
        ))}
      </select>
    </div>
  );
}
