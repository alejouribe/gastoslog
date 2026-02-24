"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ItemCategoria } from "./item-categoria";
import type { Categoria } from "@/types";

interface ListaCategoriasProps {
  categorias: Categoria[];
  onEditar: (cat: Categoria) => void;
  onDesactivar: (id: string) => Promise<void>;
  onReactivar: (id: string) => Promise<void>;
  onEliminar: (id: string) => Promise<void>;
  contarGastos: (id: string) => Promise<number>;
  cargando: boolean;
  disabled?: boolean;
}

export function ListaCategorias({
  categorias,
  onEditar,
  onDesactivar,
  onReactivar,
  onEliminar,
  contarGastos,
  cargando,
  disabled,
}: ListaCategoriasProps) {
  const [mostrarInactivas, setMostrarInactivas] = useState(false);

  const { activas, inactivas } = useMemo(() => {
    const activas: Categoria[] = [];
    const inactivas: Categoria[] = [];

    for (const cat of categorias) {
      if (cat.activa) {
        activas.push(cat);
      } else {
        inactivas.push(cat);
      }
    }

    return { activas, inactivas };
  }, [categorias]);

  if (cargando) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-16 rounded-2xl bg-gray-100 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (categorias.length === 0) {
    return (
      <div className="rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 p-8 text-center">
        <p className="text-4xl mb-3">📂</p>
        <p className="font-semibold text-gray-700">No tienes categorías</p>
        <p className="text-sm text-gray-500 mt-1">
          Crea tu primera categoría para empezar a organizar tus gastos
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activas.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Activas ({activas.length})
          </h2>
          <div className="space-y-2">
            {activas.map((cat) => (
              <ItemCategoria
                key={cat.id}
                categoria={cat}
                onEditar={onEditar}
                onDesactivar={onDesactivar}
                onReactivar={onReactivar}
                onEliminar={onEliminar}
                contarGastos={contarGastos}
                disabled={disabled}
              />
            ))}
          </div>
        </section>
      )}

      {activas.length === 0 && inactivas.length > 0 && (
        <div className="rounded-2xl bg-orange-50 border border-orange-200 p-4 text-center">
          <p className="text-sm text-orange-700">
            No tienes categorías activas. Reactiva alguna de las inactivas para poder registrar gastos.
          </p>
        </div>
      )}

      {inactivas.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setMostrarInactivas(!mostrarInactivas)}
            className={cn(
              "w-full flex items-center justify-between py-2 px-1",
              "text-sm font-semibold text-gray-500 uppercase tracking-wider",
              "hover:text-gray-700 transition-colors"
            )}
          >
            <span>Inactivas ({inactivas.length})</span>
            <svg
              className={cn(
                "w-5 h-5 transition-transform",
                mostrarInactivas && "rotate-180"
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {mostrarInactivas && (
            <div className="space-y-2 mt-3">
              {inactivas.map((cat) => (
                <ItemCategoria
                  key={cat.id}
                  categoria={cat}
                  onEditar={onEditar}
                  onDesactivar={onDesactivar}
                  onReactivar={onReactivar}
                  onEliminar={onEliminar}
                  contarGastos={contarGastos}
                  disabled={disabled}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
