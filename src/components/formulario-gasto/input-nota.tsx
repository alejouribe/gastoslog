"use client";

import { cn } from "@/lib/utils";

const MAX_CHARS = 140;

interface InputNotaProps {
  valor: string;
  onChange: (nota: string) => void;
  error?: string;
  disabled?: boolean;
}

export function InputNota({ valor, onChange, error, disabled }: InputNotaProps) {
  const restantes = MAX_CHARS - valor.length;
  const casi_lleno = restantes <= 20;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-gray-700">
        Nota{" "}
        <span className="font-normal text-gray-400">(opcional)</span>
      </label>
      <div
        className={cn(
          "rounded-2xl border-2 bg-white transition-colors",
          "focus-within:border-brand-500",
          error ? "border-red-400" : "border-gray-200",
          disabled && "opacity-50"
        )}
      >
        <textarea
          value={valor}
          onChange={(e) => {
            if (e.target.value.length <= MAX_CHARS) onChange(e.target.value);
          }}
          disabled={disabled}
          rows={2}
          placeholder="ej. café, bus, domicilio…"
          className="w-full px-4 pt-3 pb-1 bg-transparent outline-none resize-none text-sm text-gray-900 placeholder:text-gray-300"
          aria-label="Nota del gasto"
        />
        <div className="flex justify-end px-4 pb-2">
          <span
            className={cn(
              "text-xs",
              casi_lleno ? "text-orange-500 font-semibold" : "text-gray-300"
            )}
          >
            {restantes}
          </span>
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
