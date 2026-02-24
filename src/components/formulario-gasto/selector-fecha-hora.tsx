"use client";

import { useState } from "react";
import { esFechaValida } from "@/lib/periodos";
import { cn } from "@/lib/utils";

interface SelectorFechaHoraProps {
  valor: string | undefined;
  onChange: (fechaHora: string | undefined) => void;
  error?: string;
  disabled?: boolean;
}

export function SelectorFechaHora({
  valor,
  onChange,
  error: errorExterno,
  disabled,
}: SelectorFechaHoraProps) {
  const [expandido, setExpandido] = useState(false);
  const [errorInterno, setErrorInterno] = useState<string | null>(null);

  const error = errorExterno ?? errorInterno ?? undefined;

  // Formatear la fecha del input datetime-local
  function toDatetimeLocal(iso?: string): string {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (!val) {
      onChange(undefined);
      setErrorInterno(null);
      return;
    }
    const iso = new Date(val).toISOString();
    const { valida, error: err } = esFechaValida(iso);
    if (!valida) {
      setErrorInterno(err ?? null);
      return;
    }
    setErrorInterno(null);
    onChange(iso);
  }

  const fechaLegible = valor
    ? new Date(valor).toLocaleString("es-CO", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-700">
          Fecha y hora
        </label>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setExpandido((v) => !v)}
          className="text-xs text-brand-600 font-semibold"
        >
          {expandido ? "Usar ahora" : "Cambiar"}
        </button>
      </div>

      {!expandido ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border-2 border-gray-100 bg-gray-50">
          <span className="text-base">🕐</span>
          <span className="text-sm text-gray-600">
            {fechaLegible ?? "Ahora (al guardar)"}
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <input
            type="datetime-local"
            value={toDatetimeLocal(valor)}
            onChange={handleChange}
            disabled={disabled}
            max={toDatetimeLocal(new Date().toISOString())}
            className={cn(
              "px-4 py-3 rounded-2xl border-2 bg-white text-sm text-gray-900 outline-none",
              "focus:border-brand-500 transition-colors",
              error ? "border-red-400" : "border-gray-200",
              disabled && "opacity-50"
            )}
          />
          <button
            type="button"
            onClick={() => {
              onChange(undefined);
              setErrorInterno(null);
              setExpandido(false);
            }}
            className="text-xs text-gray-400 text-right"
          >
            Restablecer a ahora
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
