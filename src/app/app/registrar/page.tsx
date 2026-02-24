"use client";

import { useRouter } from "next/navigation";
import { FormularioGasto } from "@/components/formulario-gasto/formulario-gasto";
import { ToastContainer } from "@/components/ui/toast";
import { useCrearGasto } from "@/hooks/use-crear-gasto";
import { useCategorias } from "@/hooks/use-categorias";
import { useToast } from "@/hooks/use-toast";
import { useSync } from "@/contexts/sync-context";
import type { CrearGastoInput } from "@/types";

export default function PaginaRegistrar() {
  const router = useRouter();
  const { crear, guardando, error } = useCrearGasto();
  const { categorias, cargando: cargandoCats } = useCategorias();
  const { toasts, mostrar, cerrar } = useToast();
  const { estadoSync } = useSync();

  async function handleGuardar(input: CrearGastoInput) {
    const gasto = await crear(input);
    if (gasto) {
      const esPendiente = !estadoSync.online;
      mostrar(
        esPendiente
          ? "Gasto guardado (se sincronizará al conectarse)"
          : "¡Gasto registrado!",
        "exito"
      );
      // Pequeña pausa para que el usuario vea el feedback
      setTimeout(() => router.push("/app/dashboard"), 800);
    } else if (error) {
      mostrar(error, "error");
    }
  }

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={cerrar} />

      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-4 safe-area-pt">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600"
              aria-label="Volver"
            >
              ←
            </button>
            <h1 className="text-lg font-bold text-gray-900">Registrar gasto</h1>
            {!estadoSync.online && (
              <span className="ml-auto text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
                Sin conexión
              </span>
            )}
          </div>
        </header>

        {/* Contenido */}
        <div className="flex-1 px-4 py-5">
          {cargandoCats ? (
            <div className="flex flex-col gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <FormularioGasto
              categorias={categorias}
              guardando={guardando}
              onGuardar={handleGuardar}
            />
          )}
        </div>
      </div>
    </>
  );
}
