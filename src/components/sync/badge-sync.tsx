"use client";

import Link from "next/link";
import { useSync } from "@/contexts/sync-context";
import { cn } from "@/lib/utils";

interface BadgeSyncProps {
  showLink?: boolean;
  className?: string;
}

export function BadgeSync({ showLink = true, className }: BadgeSyncProps) {
  const { estadoSync } = useSync();
  const { online, sincronizando, pendientes, errores } = estadoSync;

  const hayProblemas = errores > 0;
  const hayPendientes = pendientes > 0;

  if (!hayProblemas && !hayPendientes && online) {
    return null;
  }

  const content = (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
        hayProblemas
          ? "bg-red-100 text-red-700"
          : !online
            ? "bg-gray-100 text-gray-600"
            : "bg-yellow-100 text-yellow-700",
        className
      )}
    >
      {sincronizando ? (
        <>
          <span className="animate-spin">⟳</span>
          <span>Sincronizando...</span>
        </>
      ) : hayProblemas ? (
        <>
          <span>⚠</span>
          <span>{errores} error{errores > 1 ? "es" : ""}</span>
        </>
      ) : !online ? (
        <>
          <span>○</span>
          <span>Sin conexión</span>
        </>
      ) : (
        <>
          <span>↑</span>
          <span>{pendientes} pendiente{pendientes > 1 ? "s" : ""}</span>
        </>
      )}
    </div>
  );

  if (showLink) {
    return (
      <Link href="/app/sync" className="hover:opacity-80 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}

export function BadgeOnline() {
  const { estadoSync } = useSync();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        estadoSync.online ? "text-green-600" : "text-gray-400"
      )}
    >
      <span className="text-sm">{estadoSync.online ? "●" : "○"}</span>
      {estadoSync.online ? "Conectado" : "Sin conexión"}
    </span>
  );
}
