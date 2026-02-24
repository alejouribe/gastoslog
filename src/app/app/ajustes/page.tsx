"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { usePreferencias } from "@/contexts/preferencias-context";
import { useSync } from "@/contexts/sync-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function PaginaAjustes() {
  const { usuario, cerrarSesion } = useAuth();
  const { preferencias } = usePreferencias();
  const { estadoSync } = useSync();
  const router = useRouter();
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  async function handleCerrarSesion() {
    setCerrando(true);
    await cerrarSesion();
    router.replace("/auth/login");
  }

  const formatearZonaHoraria = (tz: string): string => {
    const mapa: Record<string, string> = {
      "America/Bogota": "América/Bogotá (UTC-5)",
      "America/New_York": "Nueva York (UTC-5/-4)",
      "America/Los_Angeles": "Los Ángeles (UTC-8/-7)",
      "America/Mexico_City": "Ciudad de México (UTC-6)",
      "America/Lima": "Lima (UTC-5)",
      "America/Buenos_Aires": "Buenos Aires (UTC-3)",
      "America/Santiago": "Santiago (UTC-4/-3)",
      "Europe/Madrid": "Madrid (UTC+1/+2)",
    };
    return mapa[tz] ?? tz;
  };

  const filas: { label: string; valor: string; descripcion?: string }[] = [
    { label: "Moneda", valor: preferencias.moneda, descripcion: "Peso colombiano" },
    { label: "Zona horaria", valor: formatearZonaHoraria(preferencias.zona_horaria) },
    { label: "Semana inicia en", valor: preferencias.semana_inicia_en },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 pt-6 pb-4 safe-area-pt">
        <h1 className="text-xl font-bold text-gray-900">Ajustes</h1>
      </header>

      <div className="flex-1 px-4 flex flex-col gap-4">
        {/* Sesión */}
        <div className="rounded-3xl bg-white border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Cuenta
          </p>
          <p className="text-sm font-medium text-gray-700">{usuario?.email}</p>
        </div>

        {/* Preferencias */}
        <div className="rounded-3xl bg-white border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Preferencias
            </p>
            <span className="text-xs text-gray-400">Solo lectura</span>
          </div>
          <div className="flex flex-col divide-y divide-gray-50">
            {filas.map((f) => (
              <div key={f.label} className="flex items-center justify-between py-2.5">
                <div className="flex flex-col">
                  <span className="text-sm text-gray-600">{f.label}</span>
                  {f.descripcion && (
                    <span className="text-xs text-gray-400">{f.descripcion}</span>
                  )}
                </div>
                <span className="text-sm font-semibold text-gray-900 text-right">
                  {f.valor}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sincronización */}
        <div className="rounded-3xl bg-white border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Sincronización
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {estadoSync.pendientes > 0
                  ? `${estadoSync.pendientes} operaciones pendientes`
                  : "Todo sincronizado"}
                {estadoSync.errores > 0 && ` · ${estadoSync.errores} errores`}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {estadoSync.online ? "● Conectado" : "○ Sin conexión"}
              </p>
            </div>
            <Link
              href="/app/sync"
              className="text-xs text-brand-600 font-semibold"
            >
              Ver detalles →
            </Link>
          </div>
        </div>

        {/* Gestión */}
        <div className="rounded-3xl bg-white border border-gray-100 p-4">
          <Link
            href="/app/categorias"
            className="flex items-center justify-between py-1"
          >
            <span className="text-sm font-medium text-gray-700">
              Gestionar categorías
            </span>
            <span className="text-gray-400">→</span>
          </Link>
        </div>

        {/* Cerrar sesión */}
        {!mostrarConfirmacion ? (
          <button
            onClick={() => setMostrarConfirmacion(true)}
            className="w-full py-4 rounded-2xl border-2 border-red-200 text-red-600 font-bold text-sm active:scale-95 transition-all"
          >
            Cerrar sesión
          </button>
        ) : (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-700 mb-4">
              ¿Estás seguro de que quieres cerrar sesión?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setMostrarConfirmacion(false)}
                disabled={cerrando}
                className="flex-1 py-3 rounded-xl border border-gray-200 font-semibold text-gray-600 hover:bg-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCerrarSesion}
                disabled={cerrando}
                className={cn(
                  "flex-1 py-3 rounded-xl font-semibold text-white bg-red-500",
                  "hover:bg-red-600 transition-colors",
                  cerrando && "opacity-70"
                )}
              >
                {cerrando ? "Cerrando..." : "Confirmar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
