"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { BadgeColor } from "./badge-color";
import type { Categoria } from "@/types";

interface ItemCategoriaProps {
  categoria: Categoria;
  onEditar: (cat: Categoria) => void;
  onDesactivar: (id: string) => Promise<void>;
  onReactivar: (id: string) => Promise<void>;
  onEliminar: (id: string) => Promise<void>;
  contarGastos: (id: string) => Promise<number>;
  disabled?: boolean;
}

export function ItemCategoria({
  categoria,
  onEditar,
  onDesactivar,
  onReactivar,
  onEliminar,
  contarGastos,
  disabled,
}: ItemCategoriaProps) {
  const [conteoGastos, setConteoGastos] = useState<number | null>(null);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    contarGastos(categoria.id).then(setConteoGastos);
  }, [categoria.id, contarGastos]);

  const handleDesactivar = async () => {
    setProcesando(true);
    await onDesactivar(categoria.id);
    setProcesando(false);
  };

  const handleReactivar = async () => {
    setProcesando(true);
    await onReactivar(categoria.id);
    setProcesando(false);
  };

  const handleEliminar = async () => {
    setProcesando(true);
    await onEliminar(categoria.id);
    setProcesando(false);
    setConfirmandoEliminar(false);
  };

  const puedeEliminar = conteoGastos === 0;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-4 rounded-2xl bg-white border",
        categoria.activa ? "border-gray-100" : "border-gray-200 bg-gray-50",
        procesando && "opacity-50"
      )}
    >
      <BadgeColor color={categoria.color} nombre={categoria.nombre} size="md" />

      <div className="flex-1 min-w-0">
        {conteoGastos !== null && (
          <p className="text-xs text-gray-500">
            {conteoGastos === 0
              ? "Sin gastos"
              : `${conteoGastos} gasto${conteoGastos !== 1 ? "s" : ""}`}
          </p>
        )}
      </div>

      {!confirmandoEliminar ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEditar(categoria)}
            disabled={disabled || procesando}
            className={cn(
              "p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors",
              (disabled || procesando) && "opacity-50 cursor-not-allowed"
            )}
            title="Editar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>

          {categoria.activa ? (
            <button
              type="button"
              onClick={handleDesactivar}
              disabled={disabled || procesando}
              className={cn(
                "p-2 rounded-xl text-gray-500 hover:bg-orange-50 hover:text-orange-600 transition-colors",
                (disabled || procesando) && "opacity-50 cursor-not-allowed"
              )}
              title="Desactivar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReactivar}
              disabled={disabled || procesando}
              className={cn(
                "p-2 rounded-xl text-gray-500 hover:bg-green-50 hover:text-green-600 transition-colors",
                (disabled || procesando) && "opacity-50 cursor-not-allowed"
              )}
              title="Reactivar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          )}

          {puedeEliminar && (
            <button
              type="button"
              onClick={() => setConfirmandoEliminar(true)}
              disabled={disabled || procesando}
              className={cn(
                "p-2 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors",
                (disabled || procesando) && "opacity-50 cursor-not-allowed"
              )}
              title="Eliminar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-xs text-red-600 font-medium">¿Eliminar?</span>
          <button
            type="button"
            onClick={handleEliminar}
            disabled={procesando}
            className="px-3 py-1.5 rounded-xl bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
          >
            Sí
          </button>
          <button
            type="button"
            onClick={() => setConfirmandoEliminar(false)}
            disabled={procesando}
            className="px-3 py-1.5 rounded-xl bg-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-300 transition-colors"
          >
            No
          </button>
        </div>
      )}
    </div>
  );
}
