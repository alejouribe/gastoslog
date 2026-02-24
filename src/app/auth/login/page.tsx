"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

export default function PaginaLogin() {
  const router = useRouter();
  const { iniciarSesion } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    const err = await iniciarSesion(email, password);
    if (err) {
      setError(err);
      setCargando(false);
    } else {
      router.push("/app/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12 bg-white max-w-mobile mx-auto">
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-brand-500 mb-4 shadow-lg shadow-brand-500/30">
          <span className="text-3xl">💰</span>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900">GastoLog</h1>
        <p className="text-sm text-gray-500 mt-1">
          Controla tus gastos en segundos
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-gray-900">Iniciar sesión</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            autoComplete="email"
            required
            className="px-4 py-3 rounded-2xl border-2 border-gray-200 bg-white text-sm outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-700">
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
            className="px-4 py-3 rounded-2xl border-2 border-gray-200 bg-white text-sm outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={cargando}
          className={cn(
            "w-full py-4 rounded-2xl font-bold text-base mt-2",
            "bg-brand-500 text-white shadow-lg shadow-brand-500/30",
            "active:scale-95 transition-all",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {cargando ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-8">
        ¿No tienes cuenta?{" "}
        <Link href="/auth/registro" className="text-brand-600 font-semibold">
          Regístrate gratis
        </Link>
      </p>
    </div>
  );
}
