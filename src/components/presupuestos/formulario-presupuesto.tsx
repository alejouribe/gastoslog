"use client";

import { useState, useEffect, useCallback } from "react";
import { InputMonto } from "@/components/formulario-gasto/input-monto";
import { SelectorCategoria } from "@/components/formulario-gasto/selector-categoria";
import { SelectorMesForm } from "./selector-mes";
import { useCategorias } from "@/hooks/use-categorias";
import { useGestionPresupuestos } from "@/hooks/use-gestion-presupuestos";
import { usePreferencias } from "@/contexts/preferencias-context";
import { cn } from "@/lib/utils";
import type { Presupuesto, CrearPresupuestoInput, EditarPresupuestoInput } from "@/types";

interface FormularioPresupuestoProps {
  modo: "crear" | "editar";
  presupuestoInicial?: Presupuesto | null;
  mesInicial?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface Errores {
  categoria_id?: string;
  monto?: string;
  mes?: string;
  general?: string;
}

export function FormularioPresupuesto({
  modo,
  presupuestoInicial,
  mesInicial,
  onSuccess,
  onCancel,
}: FormularioPresupuestoProps) {
  const { preferencias } = usePreferencias();
  const { categorias, cargando: cargandoCategorias } = useCategorias();
  const {
    crear,
    editar,
    categoriasConPresupuesto,
    guardando,
    error: errorHook,
    limpiarError,
  } = useGestionPresupuestos();

  const [categoriaId, setCategoriaId] = useState(presupuestoInicial?.categoria_id ?? "");
  const [monto, setMonto] = useState(presupuestoInicial?.monto_objetivo_cop ?? 0);
  const [mes, setMes] = useState(presupuestoInicial?.mes ?? mesInicial ?? "");
  const [categoriasOcupadas, setCategoriasOcupadas] = useState<Set<string>>(new Set());
  const [errores, setErrores] = useState<Errores>({});

  const cargarCategoriasOcupadas = useCallback(async () => {
    if (!mes) return;
    const ocupadas = await categoriasConPresupuesto(mes);
    if (modo === "editar" && presupuestoInicial) {
      ocupadas.delete(presupuestoInicial.categoria_id);
    }
    setCategoriasOcupadas(ocupadas);
  }, [mes, categoriasConPresupuesto, modo, presupuestoInicial]);

  useEffect(() => {
    cargarCategoriasOcupadas();
  }, [cargarCategoriasOcupadas]);

  useEffect(() => {
    if (errorHook) {
      setErrores((prev) => ({ ...prev, general: errorHook }));
    }
  }, [errorHook]);

  const categoriasDisponibles = categorias.filter(
    (c) => !categoriasOcupadas.has(c.id)
  );

  const validar = (): boolean => {
    const nuevosErrores: Errores = {};

    if (!categoriaId) {
      nuevosErrores.categoria_id = "Selecciona una categoría";
    } else if (
      modo === "crear" &&
      categoriasOcupadas.has(categoriaId)
    ) {
      nuevosErrores.categoria_id = "Ya tienes un presupuesto para esta categoría en este mes";
    }

    if (monto <= 0) {
      nuevosErrores.monto = "Ingresa un monto objetivo válido mayor a $0";
    }

    if (!mes) {
      nuevosErrores.mes = "Selecciona un mes válido";
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    limpiarError();

    if (!validar()) return;

    let resultado: Presupuesto | null = null;

    if (modo === "crear") {
      const input: CrearPresupuestoInput = {
        categoria_id: categoriaId,
        mes,
        monto_objetivo_cop: monto,
      };
      resultado = await crear(input);
    } else if (presupuestoInicial) {
      const input: EditarPresupuestoInput = {
        id: presupuestoInicial.id,
        monto_objetivo_cop: monto,
      };
      resultado = await editar(input);
    }

    if (resultado) {
      onSuccess();
    }
  };

  const categoriaParaSelector =
    modo === "editar"
      ? categorias.filter(
          (c) => c.id === presupuestoInicial?.categoria_id || !categoriasOcupadas.has(c.id)
        )
      : categoriasDisponibles;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {errores.general && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {errores.general}
        </div>
      )}

      <SelectorMesForm
        valor={mes}
        onChange={(nuevoMes) => {
          setMes(nuevoMes);
          setErrores((prev) => ({ ...prev, mes: undefined }));
        }}
        disabled={guardando || modo === "editar"}
        zonaHoraria={preferencias.zona_horaria}
      />
      {errores.mes && <p className="text-xs text-red-500 -mt-4">{errores.mes}</p>}

      {cargandoCategorias ? (
        <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
      ) : (
        <SelectorCategoria
          categorias={categoriaParaSelector}
          valor={categoriaId}
          onChange={(id) => {
            setCategoriaId(id);
            setErrores((prev) => ({ ...prev, categoria_id: undefined }));
          }}
          error={errores.categoria_id}
          disabled={guardando || modo === "editar"}
        />
      )}

      <InputMonto
        valor={monto}
        onChange={(nuevoMonto) => {
          setMonto(nuevoMonto);
          setErrores((prev) => ({ ...prev, monto: undefined }));
        }}
        error={errores.monto}
        disabled={guardando}
      />

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={guardando}
          className={cn(
            "flex-1 py-3 rounded-2xl border-2 border-gray-200 font-semibold text-gray-600",
            "hover:bg-gray-50 transition-colors",
            guardando && "opacity-50 cursor-not-allowed"
          )}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={guardando}
          className={cn(
            "flex-1 py-3 rounded-2xl font-semibold text-white",
            "bg-brand-500 hover:bg-brand-600 transition-colors",
            guardando && "opacity-70 cursor-not-allowed"
          )}
        >
          {guardando ? "Guardando..." : modo === "crear" ? "Crear" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
