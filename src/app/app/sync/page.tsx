"use client";

import { useRouter } from "next/navigation";
import { useSync } from "@/contexts/sync-context";
import { useColaSync } from "@/hooks/use-cola-sync";
import { ResumenSync } from "@/components/sync/resumen-sync";
import { ListaOperaciones } from "@/components/sync/lista-operaciones";
import { cn } from "@/lib/utils";

export default function PaginaSync() {
  const router = useRouter();
  const { estadoSync } = useSync();
  const {
    operaciones,
    contadores,
    cargando,
    reintentarOperacion,
    reintentarTodo,
    limpiarSincronizadas,
  } = useColaSync();

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-4 safe-area-pt">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            aria-label="Volver"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">Sincronización</h1>
        </div>
      </header>

      <div className="px-4 py-5 flex flex-col gap-5">
        <ResumenSync
          online={estadoSync.online}
          sincronizando={estadoSync.sincronizando}
          pendientes={contadores.pendientes}
          errores={contadores.errores}
          sincronizados={contadores.sincronizados}
        />

        <div className="flex gap-2">
          {contadores.errores > 0 && (
            <button
              onClick={reintentarTodo}
              disabled={estadoSync.sincronizando}
              className={cn(
                "flex-1 py-3 rounded-2xl font-semibold text-sm",
                "bg-brand-500 text-white",
                "hover:bg-brand-600 transition-colors",
                estadoSync.sincronizando && "opacity-50"
              )}
            >
              Reintentar errores ({contadores.errores})
            </button>
          )}

          {contadores.sincronizados > 0 && (
            <button
              onClick={limpiarSincronizadas}
              className={cn(
                "flex-1 py-3 rounded-2xl font-semibold text-sm",
                "border-2 border-gray-200 text-gray-600",
                "hover:bg-gray-50 transition-colors"
              )}
            >
              Limpiar historial
            </button>
          )}
        </div>

        {operaciones.length === 0 && !cargando ? (
          <div className="rounded-3xl bg-white border border-gray-100 p-8 text-center">
            <p className="text-4xl mb-3">✅</p>
            <p className="font-semibold text-gray-700">Cola vacía</p>
            <p className="text-sm text-gray-400 mt-1">
              No hay operaciones en la cola de sincronización
            </p>
          </div>
        ) : (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Historial de operaciones
            </h2>
            <ListaOperaciones
              operaciones={operaciones}
              cargando={cargando}
              onReintentar={reintentarOperacion}
            />
          </div>
        )}

        <div className="mt-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Información
          </h3>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• Las operaciones pendientes se sincronizan automáticamente al recuperar conexión.</li>
            <li>• Tras 3 intentos fallidos, una operación queda en estado "Error".</li>
            <li>• Los errores se pueden reintentar manualmente.</li>
            <li>• "Limpiar historial" elimina solo las operaciones ya sincronizadas.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
