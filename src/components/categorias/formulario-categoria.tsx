"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { SelectorColor } from "./badge-color";
import type { Categoria, CrearCategoriaInput, EditarCategoriaInput } from "@/types";

interface FormularioCategoriaProps {
  modo: "crear" | "editar";
  categoriaEditar?: Categoria;
  onSubmit: (input: CrearCategoriaInput | EditarCategoriaInput) => Promise<boolean>;
  onCancel: () => void;
  validarNombre: (nombre: string, excluirId?: string) => Promise<string | null>;
  guardando: boolean;
}

export function FormularioCategoria({
  modo,
  categoriaEditar,
  onSubmit,
  onCancel,
  validarNombre,
  guardando,
}: FormularioCategoriaProps) {
  const [nombre, setNombre] = useState(categoriaEditar?.nombre ?? "");
  const [color, setColor] = useState<string>(categoriaEditar?.color ?? "gray");
  const [errorNombre, setErrorNombre] = useState<string | null>(null);
  const [validando, setValidando] = useState(false);

  useEffect(() => {
    if (categoriaEditar) {
      setNombre(categoriaEditar.nombre);
      setColor(categoriaEditar.color ?? "gray");
    }
  }, [categoriaEditar]);

  const handleValidarNombre = useCallback(async () => {
    setValidando(true);
    const error = await validarNombre(nombre, categoriaEditar?.id);
    setErrorNombre(error);
    setValidando(false);
    return error === null;
  }, [nombre, categoriaEditar?.id, validarNombre]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const esValido = await handleValidarNombre();
    if (!esValido) return;

    let exito: boolean;
    if (modo === "crear") {
      const input: CrearCategoriaInput = {
        nombre: nombre.trim(),
        color,
      };
      exito = await onSubmit(input);
    } else {
      const input: EditarCategoriaInput = {
        id: categoriaEditar!.id,
        nombre: nombre.trim(),
        color,
      };
      exito = await onSubmit(input);
    }

    if (exito) {
      setNombre("");
      setColor("gray");
      setErrorNombre(null);
    }
  };

  const caracteresRestantes = 30 - nombre.length;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nombre-categoria" className="text-sm font-semibold text-gray-700">
          Nombre
        </label>
        <div className="relative">
          <input
            id="nombre-categoria"
            type="text"
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              if (errorNombre) setErrorNombre(null);
            }}
            onBlur={handleValidarNombre}
            maxLength={30}
            placeholder="Ej: Mascotas"
            disabled={guardando}
            className={cn(
              "w-full px-4 py-3 rounded-2xl border-2 bg-white text-gray-900",
              "placeholder:text-gray-400",
              "focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500",
              "transition-all",
              errorNombre
                ? "border-red-300 focus:border-red-500 focus:ring-red-500/30"
                : "border-gray-200",
              guardando && "opacity-50 cursor-not-allowed"
            )}
          />
          <span
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 text-xs",
              caracteresRestantes <= 5 ? "text-orange-500" : "text-gray-400"
            )}
          >
            {caracteresRestantes}
          </span>
        </div>
        {errorNombre && <p className="text-xs text-red-500">{errorNombre}</p>}
      </div>

      <SelectorColor valor={color} onChange={setColor} disabled={guardando} />

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={guardando}
          className={cn(
            "flex-1 py-3 px-4 rounded-2xl font-semibold text-sm",
            "border-2 border-gray-200 text-gray-600",
            "hover:bg-gray-50 transition-colors",
            guardando && "opacity-50 cursor-not-allowed"
          )}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={guardando || validando || nombre.trim().length === 0}
          className={cn(
            "flex-1 py-3 px-4 rounded-2xl font-semibold text-sm",
            "bg-brand-600 text-white",
            "hover:bg-brand-700 transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "flex items-center justify-center gap-2"
          )}
        >
          {guardando ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Guardando...
            </>
          ) : modo === "crear" ? (
            "Crear categoría"
          ) : (
            "Guardar cambios"
          )}
        </button>
      </div>
    </form>
  );
}
