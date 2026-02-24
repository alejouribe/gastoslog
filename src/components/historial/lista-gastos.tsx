"use client";

import { useEffect, useRef, useCallback } from "react";
import { ItemGasto, ItemGastoSkeleton } from "./item-gasto";
import type { Gasto, Categoria } from "@/types";

interface ListaGastosProps {
  gastos: Gasto[];
  categorias: Categoria[];
  cargando: boolean;
  cargandoMas: boolean;
  hayMas: boolean;
  onCargarMas: () => void;
}

export function ListaGastos({
  gastos,
  categorias,
  cargando,
  cargandoMas,
  hayMas,
  onCargarMas,
}: ListaGastosProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const categoriasMap = new Map(categorias.map((c) => [c.id, c]));

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hayMas && !cargandoMas) {
        onCargarMas();
      }
    },
    [hayMas, cargandoMas, onCargarMas]
  );

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(handleIntersection, {
      rootMargin: "100px",
    });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleIntersection]);

  if (cargando) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <ItemGastoSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (gastos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {gastos.map((gasto) => (
        <ItemGasto
          key={gasto.id}
          gasto={gasto}
          categoria={categoriasMap.get(gasto.categoria_id)}
        />
      ))}

      <div ref={loadMoreRef} className="h-4" />

      {cargandoMas && (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        </div>
      )}

      {!hayMas && gastos.length >= 20 && (
        <p className="text-center text-xs text-gray-400 py-4">
          Has llegado al final de tu historial
        </p>
      )}
    </div>
  );
}
