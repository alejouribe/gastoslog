"use client";

import { useState, useCallback } from "react";

interface Toast {
  id: string;
  mensaje: string;
  tipo: "exito" | "error" | "info";
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const mostrar = useCallback(
    (mensaje: string, tipo: Toast["tipo"] = "exito", duracion = 3000) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, mensaje, tipo }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duracion);
    },
    []
  );

  const cerrar = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, mostrar, cerrar };
}
