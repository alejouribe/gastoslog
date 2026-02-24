"use client";

import { cn } from "@/lib/utils";

interface ResumenSyncProps {
  online: boolean;
  sincronizando: boolean;
  pendientes: number;
  errores: number;
  sincronizados?: number;
}

export function ResumenSync({
  online,
  sincronizando,
  pendientes,
  errores,
  sincronizados = 0,
}: ResumenSyncProps) {
  return (
    <div className="rounded-3xl bg-white border border-gray-100 p-5">
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-2xl font-extrabold text-yellow-500">{pendientes}</p>
          <p className="text-xs text-gray-500 mt-0.5">Pendientes</p>
        </div>
        <div>
          <p className="text-2xl font-extrabold text-red-500">{errores}</p>
          <p className="text-xs text-gray-500 mt-0.5">Errores</p>
        </div>
        <div>
          <p className="text-2xl font-extrabold text-green-500">{sincronizados}</p>
          <p className="text-xs text-gray-500 mt-0.5">Sincronizados</p>
        </div>
        <div>
          <div className="flex flex-col items-center">
            <span
              className={cn(
                "text-2xl font-extrabold",
                online ? "text-green-500" : "text-gray-400"
              )}
            >
              {sincronizando ? (
                <span className="animate-spin inline-block">⟳</span>
              ) : online ? (
                "●"
              ) : (
                "○"
              )}
            </span>
            <p className="text-xs text-gray-500 mt-0.5">
              {sincronizando ? "Sincronizando" : online ? "Online" : "Offline"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
