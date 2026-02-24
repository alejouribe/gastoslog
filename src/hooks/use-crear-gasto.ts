"use client";

import { useState, useCallback } from "react";
import { gastoService } from "@/services/gasto-service";
import { useAuth } from "@/contexts/auth-context";
import { useSync } from "@/contexts/sync-context";
import type { CrearGastoInput, Gasto } from "@/types";

interface UseCrearGastoResult {
  crear: (input: CrearGastoInput) => Promise<Gasto | null>;
  guardando: boolean;
  error: string | null;
  limpiarError: () => void;
}

export function useCrearGasto(): UseCrearGastoResult {
  const { usuario } = useAuth();
  const { encolarOperacion } = useSync();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const crear = useCallback(
    async (input: CrearGastoInput): Promise<Gasto | null> => {
      if (!usuario) {
        setError("Debes iniciar sesión para registrar un gasto.");
        return null;
      }

      setGuardando(true);
      setError(null);

      try {
        // 1. Escribir en IndexedDB (offline-first)
        const gasto = await gastoService.crear(input, usuario.id);

        // 2. Encolar operación para sync con Supabase
        await encolarOperacion({
          tipo: "CREATE_GASTO",
          payload: gasto as unknown as Record<string, unknown>,
          entidad_id: gasto.id,
          usuario_id: usuario.id,
        });

        // 3. Notificar a otros componentes (dashboard, historial)
        window.dispatchEvent(new CustomEvent("gasto-creado"));

        return gasto;
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : String(err);
        if (
          mensaje.includes("QuotaExceededError") ||
          mensaje.includes("storage")
        ) {
          setError(
            "No se pudo guardar. Libera espacio o intenta con conexión."
          );
        } else {
          setError("Error al guardar el gasto. Intenta de nuevo.");
        }
        return null;
      } finally {
        setGuardando(false);
      }
    },
    [usuario, encolarOperacion]
  );

  return { crear, guardando, error, limpiarError: () => setError(null) };
}
