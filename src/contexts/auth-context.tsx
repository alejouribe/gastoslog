"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface AuthState {
  usuario: User | null;
  sesion: Session | null;
  cargando: boolean;
}

interface AuthContextValue extends AuthState {
  iniciarSesion: (email: string, password: string) => Promise<string | null>;
  registrarse: (
    email: string,
    password: string
  ) => Promise<{ error: string | null; usuario: User | null }>;
  cerrarSesion: () => Promise<void>;
}

// ─── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Mapeo de errores de Supabase ─────────────────────────────────────────────

function mapearErrorAuth(message: string): string {
  if (message.includes("Invalid login credentials"))
    return "El email o la contraseña son incorrectos.";
  if (message.includes("User already registered"))
    return "Ya existe una cuenta con ese email. ¿Quieres iniciar sesión?";
  if (message.includes("Password should be at least"))
    return "La contraseña debe tener al menos 6 caracteres.";
  if (message.includes("Email not confirmed"))
    return "Debes confirmar tu email antes de iniciar sesión. Revisa tu bandeja.";
  if (message.includes("fetch") || message.includes("network"))
    return "Sin conexión. Verifica tu red e intenta de nuevo.";
  return "Ocurrió un error inesperado. Intenta de nuevo.";
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    usuario: null,
    sesion: null,
    cargando: true,
  });

  const supabase = createClient();

  useEffect(() => {
    // Cargar sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({
        usuario: session?.user ?? null,
        sesion: session,
        cargando: false,
      });
    });

    // Suscribir a cambios de sesión (login, logout, refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        usuario: session?.user ?? null,
        sesion: session,
        cargando: false,
      });
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const iniciarSesion = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return mapearErrorAuth(error.message);
      return null;
    },
    [supabase]
  );

  const registrarse = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ error: string | null; usuario: User | null }> => {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { error: mapearErrorAuth(error.message), usuario: null };
      return { error: null, usuario: data.user };
    },
    [supabase]
  );

  const cerrarSesion = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{ ...state, iniciarSesion, registrarse, cerrarSesion }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
