"use client";

import { cn } from "@/lib/utils";
import type { Periodo } from "@/types";

const PERIODOS: Periodo[] = ["Hoy", "Semana", "Mes"];

interface SelectorPeriodoProps {
  valor: Periodo;
  onChange: (periodo: Periodo) => void;
  disabled?: boolean;
}

export function SelectorPeriodo({ valor, onChange, disabled }: SelectorPeriodoProps) {
  return (
    <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl">
      {PERIODOS.map((periodo) => {
        const seleccionado = valor === periodo;
        return (
          <button
            key={periodo}
            type="button"
            onClick={() => onChange(periodo)}
            disabled={disabled}
            className={cn(
              "flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition-all",
              seleccionado
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            aria-pressed={seleccionado}
          >
            {periodo}
          </button>
        );
      })}
    </div>
  );
}
