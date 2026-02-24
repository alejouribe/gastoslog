"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { PreferenciasUsuario } from "@/types";
import { useAuth } from "./auth-context";
import { getDB } from "@/lib/db";
import { ahora } from "@/lib/utils";

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const PREFERENCIAS_DEFAULT: Omit<
  PreferenciasUsuario,
  "usuario_id" | "creado_en" | "actualizado_en"
> = {
  moneda: "COP",
  zona_horaria: "America/Bogota",
  semana_inicia_en: "Lunes",
};

// ─── Context ───────────────────────────────────────────────────────────────────

interface PreferenciasContextValue {
  preferencias: PreferenciasUsuario;
  cargando: boolean;
}

const PreferenciasContext = createContext<PreferenciasContextValue | null>(null);

function buildDefault(usuarioId: string): PreferenciasUsuario {
  const ts = ahora();
  return {
    ...PREFERENCIAS_DEFAULT,
    usuario_id: usuarioId,
    creado_en: ts,
    actualizado_en: ts,
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PreferenciasProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const [preferencias, setPreferencias] = useState<PreferenciasUsuario | null>(
    null
  );
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!usuario) {
      setCargando(false);
      return;
    }

    async function cargar() {
      try {
        const db = await getDB();
        const prefs = await db.get("preferencias_usuario", usuario!.id);
        setPreferencias(prefs ?? buildDefault(usuario!.id));
      } catch {
        setPreferencias(buildDefault(usuario!.id));
      } finally {
        setCargando(false);
      }
    }

    cargar();
  }, [usuario]);

  const valor: PreferenciasContextValue = {
    preferencias: preferencias ?? buildDefault(usuario?.id ?? ""),
    cargando,
  };

  return (
    <PreferenciasContext.Provider value={valor}>
      {children}
    </PreferenciasContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function usePreferencias(): PreferenciasContextValue {
  const ctx = useContext(PreferenciasContext);
  if (!ctx)
    throw new Error(
      "usePreferencias debe usarse dentro de PreferenciasProvider"
    );
  return ctx;
}
