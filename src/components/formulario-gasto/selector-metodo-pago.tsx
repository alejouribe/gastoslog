"use client";

import { cn } from "@/lib/utils";
import type { MetodoDePago } from "@/types";

const METODOS: { valor: MetodoDePago; label: string; emoji: string }[] = [
  { valor: "Efectivo", label: "Efectivo", emoji: "💵" },
  { valor: "Tarjeta", label: "Tarjeta", emoji: "💳" },
  { valor: "Transferencia", label: "Transferencia", emoji: "📲" },
  { valor: "Otro", label: "Otro", emoji: "•••" },
];

interface SelectorMetodoPagoProps {
  valor: MetodoDePago;
  onChange: (metodo: MetodoDePago) => void;
  error?: string;
  disabled?: boolean;
}

export function SelectorMetodoPago({
  valor,
  onChange,
  error,
  disabled,
}: SelectorMetodoPagoProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-gray-700">
        Método de pago
      </label>
      <div className="grid grid-cols-4 gap-2">
        {METODOS.map((m) => {
          const seleccionado = valor === m.valor;
          return (
            <button
              key={m.valor}
              type="button"
              disabled={disabled}
              onClick={() => onChange(m.valor)}
              className={cn(
                "flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition-all",
                "text-xs font-medium",
                seleccionado
                  ? "border-brand-500 bg-brand-50 text-brand-700 scale-105"
                  : "border-gray-100 bg-gray-50 text-gray-600 hover:bg-gray-100",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              aria-pressed={seleccionado}
            >
              <span className="text-lg">{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
