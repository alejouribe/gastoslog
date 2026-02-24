"use client";

import { cn } from "@/lib/utils";

interface BarraProgresoProps {
  porcentaje: number;
  excedido: boolean;
  className?: string;
  altura?: "sm" | "md" | "lg";
}

export function BarraProgreso({
  porcentaje,
  excedido,
  className,
  altura = "md",
}: BarraProgresoProps) {
  const anchuraProgreso = Math.min(porcentaje, 100);

  const colorBarra = excedido
    ? "bg-red-500"
    : porcentaje >= 80
      ? "bg-amber-500"
      : "bg-emerald-500";

  const alturaClase =
    altura === "sm"
      ? "h-2"
      : altura === "lg"
        ? "h-4"
        : "h-3";

  return (
    <div
      className={cn(
        "relative w-full rounded-full overflow-hidden bg-gray-100",
        alturaClase,
        className
      )}
    >
      <div
        className={cn(
          "absolute inset-y-0 left-0 rounded-full transition-all duration-300",
          colorBarra
        )}
        style={{ width: `${anchuraProgreso}%` }}
      />
      {excedido && (
        <div className="absolute inset-y-0 right-0 w-1 bg-red-700 animate-pulse" />
      )}
    </div>
  );
}
