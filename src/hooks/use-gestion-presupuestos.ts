"use client";

import { useState, useCallback } from "react";
import { presupuestoService } from "@/services/presupuesto-service";
import { useAuth } from "@/contexts/auth-context";
import { useSync } from "@/contexts/sync-context";
import type { CrearPresupuestoInput, EditarPresupuestoInput, Presupuesto } from "@/types";

export function useGestionPresupuestos() {
  const { usuario } = useAuth();
  const { encolarOperacion } = useSync();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const crear = useCallback(
    async (input: CrearPresupuestoInput): Promise<Presupuesto | null> => {
      if (!usuario) {
        setError("Debes iniciar sesión");
        return null;
      }

      setGuardando(true);
      setError(null);

      try {
        const nuevo = await presupuestoService.crear(input, usuario.id);

        await encolarOperacion({
          tipo: "CREATE_PRESUPUESTO",
          payload: nuevo as unknown as Record<string, unknown>,
          entidad_id: nuevo.id,
          usuario_id: usuario.id,
        });

        window.dispatchEvent(new CustomEvent("presupuesto-creado"));
        return nuevo;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al crear presupuesto");
        return null;
      } finally {
        setGuardando(false);
      }
    },
    [usuario, encolarOperacion]
  );

  const editar = useCallback(
    async (input: EditarPresupuestoInput): Promise<Presupuesto | null> => {
      if (!usuario) {
        setError("Debes iniciar sesión");
        return null;
      }

      setGuardando(true);
      setError(null);

      try {
        const actualizado = await presupuestoService.editar(input);

        await encolarOperacion({
          tipo: "UPDATE_PRESUPUESTO",
          payload: actualizado as unknown as Record<string, unknown>,
          entidad_id: actualizado.id,
          usuario_id: usuario.id,
        });

        window.dispatchEvent(new CustomEvent("presupuesto-actualizado"));
        return actualizado;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al editar presupuesto");
        return null;
      } finally {
        setGuardando(false);
      }
    },
    [usuario, encolarOperacion]
  );

  const desactivar = useCallback(
    async (id: string): Promise<boolean> => {
      if (!usuario) {
        setError("Debes iniciar sesión");
        return false;
      }

      setGuardando(true);
      setError(null);

      try {
        const actualizado = await presupuestoService.desactivar(id);

        await encolarOperacion({
          tipo: "UPDATE_PRESUPUESTO",
          payload: actualizado as unknown as Record<string, unknown>,
          entidad_id: actualizado.id,
          usuario_id: usuario.id,
        });

        window.dispatchEvent(new CustomEvent("presupuesto-actualizado"));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al desactivar presupuesto");
        return false;
      } finally {
        setGuardando(false);
      }
    },
    [usuario, encolarOperacion]
  );

  const obtenerPorId = useCallback(async (id: string): Promise<Presupuesto | null> => {
    return presupuestoService.obtenerPorId(id);
  }, []);

  const categoriasConPresupuesto = useCallback(
    async (mes: string): Promise<Set<string>> => {
      if (!usuario) return new Set();
      return presupuestoService.categoriasConPresupuesto(usuario.id, mes);
    },
    [usuario]
  );

  const limpiarError = useCallback(() => {
    setError(null);
  }, []);

  return {
    crear,
    editar,
    desactivar,
    obtenerPorId,
    categoriasConPresupuesto,
    guardando,
    error,
    limpiarError,
  };
}
