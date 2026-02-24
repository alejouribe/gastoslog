"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { FormularioPresupuesto } from "@/components/presupuestos/formulario-presupuesto";
import { useGestionPresupuestos } from "@/hooks/use-gestion-presupuestos";
import { usePreferencias } from "@/contexts/preferencias-context";
import { mesActual } from "@/lib/periodos";
import { formatearMes } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Presupuesto } from "@/types";

export default function PaginaFormPresupuesto() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { preferencias } = usePreferencias();
  const { obtenerPorId, desactivar, guardando } = useGestionPresupuestos();

  const id = params.id as string;
  const esModoCrear = id === "nuevo";
  const mesParam = searchParams.get("mes");

  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null);
  const [cargando, setCargando] = useState(!esModoCrear);
  const [error, setError] = useState<string | null>(null);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  const mesInicial = mesParam || mesActual(preferencias.zona_horaria);

  const cargarPresupuesto = useCallback(async () => {
    if (esModoCrear) return;

    setCargando(true);
    setError(null);

    try {
      const data = await obtenerPorId(id);
      if (!data) {
        setError("Presupuesto no encontrado");
      } else {
        setPresupuesto(data);
      }
    } catch {
      setError("Error al cargar el presupuesto");
    } finally {
      setCargando(false);
    }
  }, [id, esModoCrear, obtenerPorId]);

  useEffect(() => {
    cargarPresupuesto();
  }, [cargarPresupuesto]);

  const handleSuccess = () => {
    const mesDestino = esModoCrear ? mesInicial : presupuesto?.mes ?? mesInicial;
    router.push(`/app/presupuestos?mes=${mesDestino}`);
  };

  const handleCancel = () => {
    router.back();
  };

  const handleDesactivar = async () => {
    if (!presupuesto) return;

    const exito = await desactivar(presupuesto.id);
    if (exito) {
      router.push(`/app/presupuestos?mes=${presupuesto.mes}`);
    }
  };

  if (cargando) {
    return (
      <div className="px-4 py-6 safe-area-pt">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="flex flex-col gap-6">
          <div className="h-14 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6 safe-area-pt">
        <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center">
          <p className="text-red-700 font-medium mb-4">{error}</p>
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 safe-area-pt pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={handleCancel}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          aria-label="Volver"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">
          {esModoCrear ? "Crear presupuesto" : "Editar presupuesto"}
        </h1>
      </div>

      {!esModoCrear && presupuesto && (
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 mb-6">
          <p className="text-sm text-gray-600">
            <span className="font-medium">{formatearMes(presupuesto.mes)}</span>
            {!presupuesto.activo && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-200 text-gray-600">
                Desactivado
              </span>
            )}
          </p>
        </div>
      )}

      <FormularioPresupuesto
        modo={esModoCrear ? "crear" : "editar"}
        presupuestoInicial={presupuesto}
        mesInicial={mesInicial}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />

      {!esModoCrear && presupuesto && presupuesto.activo && (
        <div className="mt-8 pt-6 border-t border-gray-100">
          {!mostrarConfirmacion ? (
            <button
              onClick={() => setMostrarConfirmacion(true)}
              className={cn(
                "w-full py-3 rounded-2xl font-semibold",
                "border-2 border-red-200 text-red-600",
                "hover:bg-red-50 transition-colors"
              )}
            >
              Desactivar presupuesto
            </button>
          ) : (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-700 mb-4">
                El presupuesto desaparecerá de la lista principal pero podrás consultarlo en el historial.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setMostrarConfirmacion(false)}
                  disabled={guardando}
                  className="flex-1 py-2 rounded-xl border border-gray-200 font-medium text-gray-600 hover:bg-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDesactivar}
                  disabled={guardando}
                  className={cn(
                    "flex-1 py-2 rounded-xl font-semibold text-white bg-red-500",
                    "hover:bg-red-600 transition-colors",
                    guardando && "opacity-70"
                  )}
                >
                  {guardando ? "Desactivando..." : "Confirmar"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
