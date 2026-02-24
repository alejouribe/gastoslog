"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEditarGasto } from "@/hooks/use-editar-gasto";
import { useCategorias } from "@/hooks/use-categorias";
import { FormularioGasto } from "@/components/formulario-gasto/formulario-gasto";
import { ToastContainer, useToastState, showToast } from "@/components/ui/toast";
import { formatearCOP } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EditarGastoInput } from "@/types";

export default function PaginaEditarGasto() {
  const params = useParams();
  const router = useRouter();
  const gastoId = params.id as string;

  const { toasts, addToast, removeToast } = useToastState();
  const { categorias, cargando: cargandoCategorias } = useCategorias({ incluirInactivas: true });
  const { gasto, cargando, guardando, error, editar, eliminar } = useEditarGasto(gastoId);

  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  const handleGuardar = async (input: EditarGastoInput) => {
    const exito = await editar(input);
    if (exito) {
      showToast(addToast, "Gasto actualizado", "success");
      router.push("/app/historial");
    }
  };

  const handleEliminar = async () => {
    const exito = await eliminar();
    if (exito) {
      showToast(addToast, "Gasto eliminado", "success");
      router.push("/app/historial");
    }
  };

  const categoriaNombre = gasto
    ? categorias.find((c) => c.id === gasto.categoria_id)?.nombre ?? "Sin categoría"
    : "";

  if (cargando || cargandoCategorias) {
    return (
      <div className="px-4 py-6 pb-24 safe-area-pt">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!gasto) {
    return (
      <div className="px-4 py-6 pb-24 safe-area-pt">
        <div className="rounded-3xl bg-red-50 border border-red-200 p-6 text-center">
          <p className="text-4xl mb-3">❌</p>
          <p className="font-semibold text-gray-800">Gasto no encontrado</p>
          <p className="text-sm text-gray-500 mt-1">
            Este gasto no existe o ya fue eliminado.
          </p>
          <Link
            href="/app/historial"
            className="inline-block mt-4 px-5 py-2.5 bg-gray-900 text-white rounded-xl font-semibold text-sm"
          >
            Volver al historial
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 pb-24 safe-area-pt">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/app/historial"
          className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors"
          aria-label="Volver"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Editar gasto</h1>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-center mb-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        <FormularioGasto
          modo="editar"
          gastoInicial={gasto}
          categorias={categorias}
          guardando={guardando}
          onGuardar={handleGuardar}
        />

        <div className="border-t border-gray-100 pt-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Zona de peligro
          </h2>

          {!mostrarConfirmacion ? (
            <button
              type="button"
              onClick={() => setMostrarConfirmacion(true)}
              disabled={guardando}
              className={cn(
                "w-full py-3 px-4 rounded-2xl font-semibold text-sm",
                "border-2 border-red-200 text-red-600",
                "hover:bg-red-50 transition-colors",
                guardando && "opacity-50 cursor-not-allowed"
              )}
            >
              Eliminar gasto
            </button>
          ) : (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-gray-700 mb-3">
                ¿Seguro que quieres eliminar este gasto?
              </p>
              <p className="text-sm font-semibold text-gray-900 mb-4">
                {formatearCOP(gasto.monto_cop)} · {categoriaNombre}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMostrarConfirmacion(false)}
                  disabled={guardando}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl font-semibold text-sm",
                    "bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors",
                    guardando && "opacity-50 cursor-not-allowed"
                  )}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleEliminar}
                  disabled={guardando}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl font-semibold text-sm",
                    "bg-red-600 text-white hover:bg-red-700 transition-colors",
                    guardando && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {guardando ? "Eliminando..." : "Sí, eliminar"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
