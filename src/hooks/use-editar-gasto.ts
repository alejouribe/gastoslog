"use client";

import { useState, useEffect, useCallback } from "react";
import { gastoService } from "@/services/gasto-service";
import { useAuth } from "@/contexts/auth-context";
import { useSync } from "@/contexts/sync-context";
import type { Gasto, EditarGastoInput } from "@/types";

export function useEditarGasto(id: string) {
  const { usuario } = useAuth();
  const { encolarOperacion } = useSync();
  const [gasto, setGasto] = useState<Gasto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      if (!id) {
        setCargando(false);
        return;
      }

      setCargando(true);
      setError(null);

      try {
        const resultado = await gastoService.obtenerPorId(id);
        setGasto(resultado);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar gasto");
      } finally {
        setCargando(false);
      }
    }

    cargar();
  }, [id]);

  const editar = useCallback(
    async (input: EditarGastoInput): Promise<boolean> => {
      if (!usuario || !gasto) {
        setError("No se puede editar el gasto");
        return false;
      }

      setGuardando(true);
      setError(null);

      try {
        const actualizado = await gastoService.editar(input);

        await encolarOperacion({
          tipo: "UPDATE_GASTO",
          payload: actualizado as unknown as Record<string, unknown>,
          entidad_id: actualizado.id,
          usuario_id: usuario.id,
        });

        setGasto(actualizado);
        window.dispatchEvent(new CustomEvent("gasto-actualizado"));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al editar gasto");
        return false;
      } finally {
        setGuardando(false);
      }
    },
    [usuario, gasto, encolarOperacion]
  );

  const eliminar = useCallback(async (): Promise<boolean> => {
    if (!usuario || !gasto) {
      setError("No se puede eliminar el gasto");
      return false;
    }

    setGuardando(true);
    setError(null);

    try {
      const eliminado = await gastoService.eliminar(gasto.id);

      await encolarOperacion({
        tipo: "UPDATE_GASTO",
        payload: eliminado as unknown as Record<string, unknown>,
        entidad_id: eliminado.id,
        usuario_id: usuario.id,
      });

      window.dispatchEvent(new CustomEvent("gasto-eliminado"));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar gasto");
      return false;
    } finally {
      setGuardando(false);
    }
  }, [usuario, gasto, encolarOperacion]);

  return {
    gasto,
    cargando,
    guardando,
    error,
    editar,
    eliminar,
  };
}
