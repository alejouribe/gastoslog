"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface BarraBusquedaProps {
  valor: string;
  onChange: (texto: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function BarraBusqueda({
  valor,
  onChange,
  placeholder = "Buscar en notas...",
  disabled,
}: BarraBusquedaProps) {
  const [valorLocal, setValorLocal] = useState(valor);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setValorLocal(valor);
  }, [valor]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nuevoValor = e.target.value;
    setValorLocal(nuevoValor);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onChange(nuevoValor);
    }, 300);
  };

  const handleClear = () => {
    setValorLocal("");
    onChange("");
  };

  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <input
        type="text"
        value={valorLocal}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "w-full pl-12 pr-10 py-3 rounded-2xl border-2 border-gray-200 bg-white",
          "text-gray-900 placeholder:text-gray-400 text-sm",
          "focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30",
          "transition-all",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      />
      {valorLocal && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
          aria-label="Limpiar búsqueda"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
