"use client";

import { useState } from "react";
import { ItemOperacion, ItemOperacionSkeleton } from "./item-operacion";
import type { OperacionSync, EstadoOperacion } from "@/types";

interface ListaOperacionesProps {
  operaciones: OperacionSync[];
  cargando?: boolean;
  onReintentar: (id: string) => Promise<void>;
}

type Filtro = "todos" | EstadoOperacion;

const FILTROS: { valor: Filtro; label: string }[] = [
  { valor: "todos", label: "Todos" },
  { valor: "Pendiente", label: "Pendientes" },
  { valor: "Error", label: "Errores" },
  { valor: "Sincronizado", label: "Sincronizados" },
];

export function ListaOperaciones({
  operaciones,
  cargando,
  onReintentar,
}: ListaOperacionesProps) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [reintentandoId, setReintentandoId] = useState<string | null>(null);

  const opsFiltradas =
    filtro === "todos"
      ? operaciones
      : operaciones.filter((o) => o.estado === filtro);

  const handleReintentar = async (id: string) => {
    setReintentandoId(id);
    await onReintentar(id);
    setReintentandoId(null);
  };

  if (cargando) {
    return (
      <div className="flex flex-col gap-3">
        <ItemOperacionSkeleton />
        <ItemOperacionSkeleton />
        <ItemOperacionSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTROS.map((f) => {
          const count =
            f.valor === "todos"
              ? operaciones.length
              : operaciones.filter((o) => o.estado === f.valor).length;

          return (
            <button
              key={f.valor}
              onClick={() => setFiltro(f.valor)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                filtro === f.valor
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {opsFiltradas.length === 0 ? (
        <div className="p-6 text-center bg-white rounded-2xl border border-gray-100">
          <p className="text-gray-500 text-sm">
            No hay operaciones{" "}
            {filtro !== "todos" && `en estado "${filtro.toLowerCase()}"`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {opsFiltradas.map((op) => (
            <ItemOperacion
              key={op.id_operacion}
              operacion={op}
              onReintentar={
                op.estado === "Error"
                  ? () => handleReintentar(op.id_operacion)
                  : undefined
              }
              reintentando={reintentandoId === op.id_operacion}
            />
          ))}
        </div>
      )}
    </div>
  );
}
