"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSync } from "@/contexts/sync-context";

const TABS = [
  { href: "/app/dashboard", label: "Inicio", icon: "📊" },
  { href: "/app/registrar", label: "Registrar", icon: "➕" },
  { href: "/app/historial", label: "Historial", icon: "📋" },
  { href: "/app/presupuestos", label: "Presupuestos", icon: "🎯" },
  { href: "/app/ajustes", label: "Ajustes", icon: "⚙️" },
];

export function NavTabs() {
  const pathname = usePathname();
  const { estadoSync } = useSync();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 safe-area-pb">
      <div className="max-w-mobile mx-auto grid grid-cols-5">
        {TABS.map((tab) => {
          const activo = pathname.startsWith(tab.href);
          const esAjustes = tab.href === "/app/ajustes";
          const tienePendientes = estadoSync.errores > 0;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 px-1 transition-colors relative",
                activo ? "text-brand-600" : "text-gray-400"
              )}
            >
              <span className="text-xl relative">
                {tab.icon}
                {esAjustes && tienePendientes && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  activo ? "text-brand-600" : "text-gray-400"
                )}
              >
                {tab.label}
              </span>
              {activo && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-brand-500 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
