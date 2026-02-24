"use client";

import { useState, useRef } from "react";
import { formatearInputMonto, parsearMontoCOP } from "@/lib/format";
import { cn } from "@/lib/utils";

interface InputMontoProps {
  valor: number;
  onChange: (monto: number) => void;
  error?: string;
  disabled?: boolean;
}

export function InputMonto({
  valor,
  onChange,
  error,
  disabled,
}: InputMontoProps) {
  const [displayValue, setDisplayValue] = useState(
    valor > 0 ? formatearInputMonto(String(valor)) : ""
  );
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const formatted = formatearInputMonto(raw);
    setDisplayValue(formatted);
    onChange(parsearMontoCOP(formatted));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-gray-700">Monto</label>
      <div
        className={cn(
          "flex items-center rounded-2xl border-2 bg-white px-4 py-3 gap-2",
          "focus-within:border-brand-500 transition-colors",
          error ? "border-red-400" : "border-gray-200",
          disabled && "opacity-50"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <span className="text-2xl font-bold text-gray-400">$</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9.]*"
          value={displayValue}
          onChange={handleChange}
          placeholder="0"
          disabled={disabled}
          className="flex-1 text-2xl font-bold text-gray-900 bg-transparent outline-none placeholder:text-gray-300"
          aria-label="Monto en pesos colombianos"
          aria-describedby={error ? "monto-error" : undefined}
        />
        <span className="text-sm text-gray-400 font-medium">COP</span>
      </div>
      {error && (
        <p id="monto-error" className="text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
