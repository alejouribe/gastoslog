"use client";

import { useState, useEffect } from "react";
import { InputMonto } from "./input-monto";
import { SelectorCategoria } from "./selector-categoria";
import { SelectorMetodoPago } from "./selector-metodo-pago";
import { InputNota } from "./input-nota";
import { SelectorFechaHora } from "./selector-fecha-hora";
import { cn } from "@/lib/utils";
import type { Categoria, CrearGastoInput, EditarGastoInput, MetodoDePago, Gasto } from "@/types";

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface Errores {
  monto_cop?: string;
  categoria_id?: string;
  metodo_de_pago?: string;
  nota?: string;
  fecha_hora?: string;
}

interface FormularioGastoPropsBase {
  categorias: Categoria[];
  guardando: boolean;
}

interface FormularioGastoPropsCrear extends FormularioGastoPropsBase {
  modo?: "crear";
  gastoInicial?: undefined;
  onGuardar: (input: CrearGastoInput) => Promise<void>;
}

interface FormularioGastoPropsEditar extends FormularioGastoPropsBase {
  modo: "editar";
  gastoInicial: Gasto;
  onGuardar: (input: EditarGastoInput) => Promise<void>;
}

type FormularioGastoProps = FormularioGastoPropsCrear | FormularioGastoPropsEditar;

// ─── Estado inicial ────────────────────────────────────────────────────────────

interface EstadoFormulario {
  monto_cop: number;
  categoria_id: string;
  metodo_de_pago: MetodoDePago;
  nota: string;
  fecha_hora: string | undefined;
}

function estadoInicial(gastoInicial?: Gasto): EstadoFormulario {
  if (gastoInicial) {
    return {
      monto_cop: gastoInicial.monto_cop,
      categoria_id: gastoInicial.categoria_id,
      metodo_de_pago: gastoInicial.metodo_de_pago,
      nota: gastoInicial.nota ?? "",
      fecha_hora: gastoInicial.fecha_hora,
    };
  }
  return {
    monto_cop: 0,
    categoria_id: "",
    metodo_de_pago: "Efectivo",
    nota: "",
    fecha_hora: undefined,
  };
}

// ─── Validación ────────────────────────────────────────────────────────────────

function validar(estado: EstadoFormulario): Errores {
  const errores: Errores = {};
  if (!estado.monto_cop || estado.monto_cop <= 0)
    errores.monto_cop = "Ingresa un monto válido mayor a $0";
  if (!estado.categoria_id)
    errores.categoria_id = "Selecciona una categoría";
  if (!estado.metodo_de_pago)
    errores.metodo_de_pago = "Selecciona un método de pago";
  if (estado.nota.length > 140)
    errores.nota = "La nota no puede superar 140 caracteres";
  return errores;
}

// ─── Componente ────────────────────────────────────────────────────────────────

export function FormularioGasto(props: FormularioGastoProps) {
  const { categorias, guardando, onGuardar } = props;
  const modo = props.modo ?? "crear";
  const gastoInicial = props.modo === "editar" ? props.gastoInicial : undefined;

  const [estado, setEstado] = useState<EstadoFormulario>(() => estadoInicial(gastoInicial));
  const [errores, setErrores] = useState<Errores>({});
  const [intentoGuardar, setIntentoGuardar] = useState(false);

  useEffect(() => {
    if (gastoInicial) {
      setEstado(estadoInicial(gastoInicial));
    }
  }, [gastoInicial?.id]);

  function set<K extends keyof EstadoFormulario>(
    campo: K,
    valor: EstadoFormulario[K]
  ) {
    setEstado((prev) => {
      const nuevo = { ...prev, [campo]: valor };
      if (intentoGuardar) setErrores(validar(nuevo));
      return nuevo;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIntentoGuardar(true);

    const erroresActuales = validar(estado);
    if (Object.keys(erroresActuales).length > 0) {
      setErrores(erroresActuales);
      return;
    }

    if (modo === "editar" && gastoInicial) {
      await (onGuardar as (input: EditarGastoInput) => Promise<void>)({
        id: gastoInicial.id,
        monto_cop: estado.monto_cop,
        categoria_id: estado.categoria_id,
        metodo_de_pago: estado.metodo_de_pago,
        nota: estado.nota || null,
        fecha_hora: estado.fecha_hora,
      });
    } else {
      await (onGuardar as (input: CrearGastoInput) => Promise<void>)({
        monto_cop: estado.monto_cop,
        categoria_id: estado.categoria_id,
        metodo_de_pago: estado.metodo_de_pago,
        nota: estado.nota || undefined,
        fecha_hora: estado.fecha_hora,
      });

      setEstado(estadoInicial());
      setErrores({});
      setIntentoGuardar(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {/* Monto */}
      <InputMonto
        valor={estado.monto_cop}
        onChange={(v) => set("monto_cop", v)}
        error={errores.monto_cop}
        disabled={guardando}
      />

      {/* Categoría */}
      <SelectorCategoria
        categorias={categorias}
        valor={estado.categoria_id}
        onChange={(v) => set("categoria_id", v)}
        error={errores.categoria_id}
        disabled={guardando}
      />

      {/* Método de pago */}
      <SelectorMetodoPago
        valor={estado.metodo_de_pago}
        onChange={(v) => set("metodo_de_pago", v)}
        error={errores.metodo_de_pago}
        disabled={guardando}
      />

      {/* Nota */}
      <InputNota
        valor={estado.nota}
        onChange={(v) => set("nota", v)}
        error={errores.nota}
        disabled={guardando}
      />

      {/* Fecha y hora */}
      <SelectorFechaHora
        valor={estado.fecha_hora}
        onChange={(v) => set("fecha_hora", v)}
        error={errores.fecha_hora}
        disabled={guardando}
      />

      {/* Botón guardar */}
      <button
        type="submit"
        disabled={guardando || categorias.length === 0}
        className={cn(
          "w-full py-4 rounded-2xl font-bold text-base transition-all",
          "bg-brand-500 text-white shadow-lg shadow-brand-500/30",
          "active:scale-95",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        )}
      >
        {guardando ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            Guardando…
          </span>
        ) : modo === "editar" ? (
          "Guardar cambios"
        ) : (
          "Guardar gasto"
        )}
      </button>
    </form>
  );
}
