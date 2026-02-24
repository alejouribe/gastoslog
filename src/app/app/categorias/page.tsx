"use client";

import { useState, useCallback } from "react";
import { useCategorias } from "@/hooks/use-categorias";
import { useGestionCategorias } from "@/hooks/use-gestion-categorias";
import { ListaCategorias, FormularioCategoria } from "@/components/categorias";
import { ToastContainer, useToastState, showToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { Categoria, CrearCategoriaInput, EditarCategoriaInput } from "@/types";

type ModoFormulario = "cerrado" | "crear" | "editar";

export default function PaginaCategorias() {
  const [modoFormulario, setModoFormulario] = useState<ModoFormulario>("cerrado");
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | undefined>();
  const { toasts, addToast, removeToast } = useToastState();

  const { categorias, cargando, recargar } = useCategorias({ incluirInactivas: true });

  const {
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
  } = useGestionCategorias(recargar);

  const handleAbrirCrear = () => {
    setCategoriaEditando(undefined);
    setModoFormulario("crear");
    limpiarError();
  };

  const handleAbrirEditar = (cat: Categoria) => {
    setCategoriaEditando(cat);
    setModoFormulario("editar");
    limpiarError();
  };

  const handleCerrarFormulario = () => {
    setModoFormulario("cerrado");
    setCategoriaEditando(undefined);
    limpiarError();
  };

  const handleSubmit = useCallback(
    async (input: CrearCategoriaInput | EditarCategoriaInput): Promise<boolean> => {
      let resultado: Categoria | null = null;

      if (modoFormulario === "crear") {
        resultado = await crear(input as CrearCategoriaInput);
        if (resultado) {
          showToast(addToast, "Categoría creada", "success");
          handleCerrarFormulario();
          return true;
        }
      } else {
        resultado = await editar(input as EditarCategoriaInput);
        if (resultado) {
          showToast(addToast, "Categoría actualizada", "success");
          handleCerrarFormulario();
          return true;
        }
      }

      return false;
    },
    [modoFormulario, crear, editar, addToast]
  );

  const handleDesactivar = useCallback(
    async (id: string) => {
      const exito = await desactivar(id);
      if (exito) {
        showToast(addToast, "Categoría desactivada", "success");
      }
    },
    [desactivar, addToast]
  );

  const handleReactivar = useCallback(
    async (id: string) => {
      const exito = await reactivar(id);
      if (exito) {
        showToast(addToast, "Categoría reactivada", "success");
      }
    },
    [reactivar, addToast]
  );

  const handleEliminar = useCallback(
    async (id: string) => {
      const exito = await eliminar(id);
      if (exito) {
        showToast(addToast, "Categoría eliminada", "success");
      } else {
        showToast(addToast, error ?? "Error al eliminar", "error");
      }
    },
    [eliminar, error, addToast]
  );

  return (
    <div className="px-4 py-6 pb-24 safe-area-pt">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Categorías</h1>
        {modoFormulario === "cerrado" && (
          <button
            type="button"
            onClick={handleAbrirCrear}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-2xl",
              "bg-brand-600 text-white text-sm font-semibold",
              "hover:bg-brand-700 transition-colors",
              "shadow-sm"
            )}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nueva
          </button>
        )}
      </div>

      {modoFormulario !== "cerrado" && (
        <div className="mb-6 p-4 rounded-3xl bg-white border border-gray-100 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            {modoFormulario === "crear" ? "Crear categoría" : "Editar categoría"}
          </h2>
          <FormularioCategoria
            modo={modoFormulario}
            categoriaEditar={categoriaEditando}
            onSubmit={handleSubmit}
            onCancel={handleCerrarFormulario}
            validarNombre={validarNombre}
            guardando={guardando}
          />
          {error && (
            <p className="mt-3 text-sm text-red-500 text-center">{error}</p>
          )}
        </div>
      )}

      <ListaCategorias
        categorias={categorias}
        onEditar={handleAbrirEditar}
        onDesactivar={handleDesactivar}
        onReactivar={handleReactivar}
        onEliminar={handleEliminar}
        contarGastos={contarGastos}
        cargando={cargando}
        disabled={guardando || modoFormulario !== "cerrado"}
      />

      {!cargando && categorias.length === 0 && modoFormulario === "cerrado" && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={handleAbrirCrear}
            className={cn(
              "inline-flex items-center gap-2 px-6 py-3 rounded-2xl",
              "bg-brand-600 text-white font-semibold",
              "hover:bg-brand-700 transition-colors",
              "shadow-md"
            )}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Crear primera categoría
          </button>
        </div>
      )}
    </div>
  );
}
