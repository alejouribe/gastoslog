"use client";

import { useState, useCallback } from "react";
import { categoriaService } from "@/services/categoria-service";
import { useAuth } from "@/contexts/auth-context";
import { useSync } from "@/contexts/sync-context";
import type { CrearCategoriaInput, EditarCategoriaInput, Categoria } from "@/types";

export function useGestionCategorias(onMutacion?: () => void) {
  const { usuario } = useAuth();
  const { encolarOperacion } = useSync();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const crear = useCallback(
    async (input: CrearCategoriaInput): Promise<Categoria | null> => {
      if (!usuario) {
        setError("Debes iniciar sesión");
        return null;
      }

      setGuardando(true);
      setError(null);

      try {
        const nueva = await categoriaService.crear(input, usuario.id);

        await encolarOperacion({
          tipo: "CREATE_CATEGORIA",
          payload: nueva as unknown as Record<string, unknown>,
          entidad_id: nueva.id,
          usuario_id: usuario.id,
        });

        onMutacion?.();
        return nueva;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al crear categoría");
        return null;
      } finally {
        setGuardando(false);
      }
    },
    [usuario, encolarOperacion, onMutacion]
  );

  const editar = useCallback(
    async (input: EditarCategoriaInput): Promise<Categoria | null> => {
      if (!usuario) {
        setError("Debes iniciar sesión");
        return null;
      }

      setGuardando(true);
      setError(null);

      try {
        const actualizada = await categoriaService.editar(input);

        await encolarOperacion({
          tipo: "UPDATE_CATEGORIA",
          payload: actualizada as unknown as Record<string, unknown>,
          entidad_id: actualizada.id,
          usuario_id: usuario.id,
        });

        onMutacion?.();
        return actualizada;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al editar categoría");
        return null;
      } finally {
        setGuardando(false);
      }
    },
    [usuario, encolarOperacion, onMutacion]
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
        const actualizada = await categoriaService.desactivar(id);

        await encolarOperacion({
          tipo: "UPDATE_CATEGORIA",
          payload: actualizada as unknown as Record<string, unknown>,
          entidad_id: actualizada.id,
          usuario_id: usuario.id,
        });

        onMutacion?.();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al desactivar categoría");
        return false;
      } finally {
        setGuardando(false);
      }
    },
    [usuario, encolarOperacion, onMutacion]
  );

  const reactivar = useCallback(
    async (id: string): Promise<boolean> => {
      if (!usuario) {
        setError("Debes iniciar sesión");
        return false;
      }

      setGuardando(true);
      setError(null);

      try {
        const actualizada = await categoriaService.reactivar(id);

        await encolarOperacion({
          tipo: "UPDATE_CATEGORIA",
          payload: actualizada as unknown as Record<string, unknown>,
          entidad_id: actualizada.id,
          usuario_id: usuario.id,
        });

        onMutacion?.();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al reactivar categoría");
        return false;
      } finally {
        setGuardando(false);
      }
    },
    [usuario, encolarOperacion, onMutacion]
  );

  const eliminar = useCallback(
    async (id: string): Promise<boolean> => {
      if (!usuario) {
        setError("Debes iniciar sesión");
        return false;
      }

      setGuardando(true);
      setError(null);

      try {
        await categoriaService.eliminar(id, usuario.id);
        onMutacion?.();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al eliminar categoría");
        return false;
      } finally {
        setGuardando(false);
      }
    },
    [usuario, onMutacion]
  );

  const contarGastos = useCallback(
    async (categoriaId: string): Promise<number> => {
      if (!usuario) return 0;
      return categoriaService.contarGastos(categoriaId, usuario.id);
    },
    [usuario]
  );

  const validarNombre = useCallback(
    async (nombre: string, excluirId?: string): Promise<string | null> => {
      if (!usuario) return null;

      const nombreTrimmed = nombre.trim();
      if (nombreTrimmed.length === 0) {
        return "El nombre es obligatorio";
      }
      if (nombreTrimmed.length > 30) {
        return "El nombre debe tener máximo 30 caracteres";
      }

      const existe = await categoriaService.existeNombre(nombreTrimmed, usuario.id, excluirId);
      if (existe) {
        return "Ya existe una categoría con ese nombre";
      }

      return null;
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
    reactivar,
    eliminar,
    contarGastos,
    validarNombre,
    guardando,
    error,
    limpiarError,
  };
}
