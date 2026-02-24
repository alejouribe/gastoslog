"use client";

import { useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { COLOR_CLASES, COLOR_DOT } from "@/services/categoria-service";
import type { Categoria } from "@/types";

const ULTIMA_CATEGORIA_KEY = "gastolog:ultima_categoria";

export function guardarUltimaCategoria(categoriaId: string) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(ULTIMA_CATEGORIA_KEY, categoriaId);
  }
}

export function obtenerUltimaCategoria(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(ULTIMA_CATEGORIA_KEY);
}

interface SelectorCategoriaProps {
  categorias: Categoria[];
  valor: string;
  onChange: (categoriaId: string) => void;
  error?: string;
  disabled?: boolean;
}

export function SelectorCategoria({
  categorias,
  valor,
  onChange,
  error,
  disabled,
}: SelectorCategoriaProps) {
  useEffect(() => {
    if (!valor) {
      const ultima = obtenerUltimaCategoria();
      if (ultima && categorias.some((c) => c.id === ultima)) {
        onChange(ultima);
      }
    }
  }, [categorias]); // eslint-disable-line react-hooks/exhaustive-deps

  if (categorias.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-gray-200 p-6 text-center">
        <p className="text-3xl mb-2">📂</p>
        <p className="text-sm text-gray-600 font-medium mb-3">
          No tienes categorías activas
        </p>
        <Link
          href="/app/categorias"
          className={cn(
            "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl",
            "bg-brand-600 text-white text-sm font-semibold",
            "hover:bg-brand-700 transition-colors"
          )}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Crear categoría
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-700">Categoría</label>
        <Link
          href="/app/categorias"
          className="text-xs text-brand-600 font-medium hover:underline"
        >
          Gestionar
        </Link>
      </div>
      <div
        className={cn(
          "grid gap-2",
          categorias.length <= 9 ? "grid-cols-3" : "grid-cols-3"
        )}
      >
        {categorias.map((cat) => {
          const colorClase =
            COLOR_CLASES[cat.color ?? "gray"] ?? COLOR_CLASES["gray"];
          const dotClase =
            COLOR_DOT[cat.color ?? "gray"] ?? COLOR_DOT["gray"];
          const seleccionada = valor === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              disabled={disabled}
              onClick={() => {
                onChange(cat.id);
                guardarUltimaCategoria(cat.id);
              }}
              className={cn(
                "flex flex-col items-center gap-1.5 px-2 py-3 rounded-2xl border-2 transition-all",
                "text-xs font-medium leading-tight text-center",
                seleccionada
                  ? cn(colorClase, "border-current ring-2 ring-offset-1 ring-current/40 scale-105")
                  : "border-gray-100 bg-gray-50 text-gray-600 hover:bg-gray-100",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              aria-pressed={seleccionada}
              aria-label={cat.nombre}
            >
              <span className={cn("w-3 h-3 rounded-full", seleccionada ? dotClase : "bg-gray-300")} />
              <span className="truncate w-full">{cat.nombre}</span>
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
