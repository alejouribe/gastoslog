import { cn } from "@/lib/utils";
import type { EstadoSyncEntidad } from "@/types";

interface BadgeSyncProps {
  estado: EstadoSyncEntidad;
  className?: string;
}

const CONFIG: Record<
  EstadoSyncEntidad,
  { dot: string; label: string; visible: boolean }
> = {
  Sincronizado: { dot: "bg-green-400", label: "Sincronizado", visible: false },
  Pendiente: { dot: "bg-yellow-400", label: "Pendiente", visible: true },
  Error: { dot: "bg-red-500", label: "Error de sync", visible: true },
};

export function BadgeSync({ estado, className }: BadgeSyncProps) {
  const config = CONFIG[estado];
  if (!config.visible) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
        estado === "Pendiente"
          ? "bg-yellow-50 text-yellow-700"
          : "bg-red-50 text-red-700",
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}
