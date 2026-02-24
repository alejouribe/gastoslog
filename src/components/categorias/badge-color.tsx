"use client";

import { cn } from "@/lib/utils";
import { COLOR_CLASES, COLOR_DOT } from "@/services/categoria-service";

export const COLORES_DISPONIBLES = [
  { id: "orange", nombre: "Naranja" },
  { id: "blue", nombre: "Azul" },
  { id: "purple", nombre: "Morado" },
  { id: "red", nombre: "Rojo" },
  { id: "green", nombre: "Verde" },
  { id: "cyan", nombre: "Cian" },
  { id: "pink", nombre: "Rosa" },
  { id: "yellow", nombre: "Amarillo" },
  { id: "gray", nombre: "Gris" },
];

interface BadgeColorProps {
  color: string | null;
  nombre?: string;
  size?: "sm" | "md" | "lg";
  showDot?: boolean;
}

export function BadgeColor({ color, nombre, size = "md", showDot = true }: BadgeColorProps) {
  const colorKey = color ?? "gray";
  const claseColor = COLOR_CLASES[colorKey] ?? COLOR_CLASES["gray"];
  const claseDot = COLOR_DOT[colorKey] ?? COLOR_DOT["gray"];

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  const dotSizeClasses = {
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        claseColor,
        sizeClasses[size]
      )}
    >
      {showDot && (
        <span className={cn("rounded-full flex-shrink-0", claseDot, dotSizeClasses[size])} />
      )}
      {nombre && <span className="truncate">{nombre}</span>}
    </span>
  );
}

interface SelectorColorProps {
  valor: string | null;
  onChange: (color: string) => void;
  disabled?: boolean;
}

export function SelectorColor({ valor, onChange, disabled }: SelectorColorProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-gray-700">Color</label>
      <div className="flex flex-wrap gap-2">
        {COLORES_DISPONIBLES.map((c) => {
          const seleccionado = valor === c.id;
          const dotClase = COLOR_DOT[c.id];

          return (
            <button
              key={c.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(c.id)}
              className={cn(
                "w-8 h-8 rounded-full transition-all flex items-center justify-center",
                "border-2",
                seleccionado
                  ? "border-gray-800 ring-2 ring-offset-1 ring-gray-400 scale-110"
                  : "border-transparent hover:scale-105",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              title={c.nombre}
              aria-label={c.nombre}
              aria-pressed={seleccionado}
            >
              <span className={cn("w-6 h-6 rounded-full", dotClase)} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
