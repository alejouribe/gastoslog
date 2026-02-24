"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { PantallaCarga } from "./pantalla-carga";

interface GuardaRutaProps {
  children: ReactNode;
}

/**
 * Componente que protege rutas client-side.
 * Complementa al middleware de Next.js para evitar flash de contenido protegido.
 * Muestra PantallaCarga mientras se verifica la sesión.
 */
export function GuardaRuta({ children }: GuardaRutaProps) {
  const { usuario, cargando } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!cargando && !usuario) {
      router.replace("/auth/login");
    }
  }, [cargando, usuario, router]);

  if (cargando) {
    return <PantallaCarga />;
  }

  if (!usuario) {
    return <PantallaCarga />;
  }

  return <>{children}</>;
}
