"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { categoriaService } from "@/services/categoria-service";
import { useAuth } from "@/contexts/auth-context";
import type { Categoria } from "@/types";

export function useCategorias(opciones: { incluirInactivas?: boolean } = {}) {
  const { usuario } = useAuth();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inicializandoRef = useRef(false);

  const cargar = useCallback(async () => {
    if (!usuario) {
      setCargando(false);
      return;
    }

    try {
      setCargando(true);
      setError(null);

      // Intentar cargar categorías
      let cats = await categoriaService.listar(usuario.id, opciones);

      // Si no hay categorías, intentar inicializar las por defecto
      if (cats.length === 0 && !inicializandoRef.current) {
        inicializandoRef.current = true;
        try {
          await categoriaService.inicializarDefaults(usuario.id);
          cats = await categoriaService.listar(usuario.id, opciones);
        } catch (initErr) {
          console.error("Error al inicializar categorías:", initErr);
        }
        inicializandoRef.current = false;
      }

      setCategorias(cats);
    } catch (err) {
      console.error("Error al cargar categorías:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCargando(false);
    }
  }, [usuario, opciones.incluirInactivas]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { categorias, cargando, error, recargar: cargar };
}
