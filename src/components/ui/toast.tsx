"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { generarUUID } from "@/lib/utils";

export interface ToastItem {
  id: string;
  mensaje: string;
  tipo: "exito" | "error" | "info" | "success";
}

interface ToastContainerProps {
  toasts: ToastItem[];
  removeToast: (id: string) => void;
}

const ESTILOS: Record<ToastItem["tipo"], string> = {
  exito: "bg-green-600 text-white",
  success: "bg-green-600 text-white",
  error: "bg-red-600 text-white",
  info: "bg-gray-800 text-white",
};

const ICONOS: Record<ToastItem["tipo"], string> = {
  exito: "✓",
  success: "✓",
  error: "✕",
  info: "ℹ",
};

export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg",
            "animate-in slide-in-from-top-2 duration-200",
            ESTILOS[t.tipo]
          )}
        >
          <span className="text-lg font-bold">{ICONOS[t.tipo]}</span>
          <p className="flex-1 text-sm font-medium">{t.mensaje}</p>
          <button
            onClick={() => removeToast(t.id)}
            className="text-white/70 hover:text-white ml-2"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToastState() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((toast: ToastItem) => {
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

export function showToast(
  addToast: (toast: ToastItem) => void,
  mensaje: string,
  tipo: ToastItem["tipo"] = "info"
) {
  addToast({
    id: generarUUID(),
    mensaje,
    tipo,
  });
}
