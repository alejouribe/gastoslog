"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { inicializacionUsuarioService } from "@/services/inicializacion-usuario-service";
import { cn } from "@/lib/utils";

export default function PaginaRegistro() {
  const router = useRouter();
  const { registrarse } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [terminos, setTerminos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (!terminos) {
      setError("Debes aceptar los términos para continuar.");
      return;
    }

    setCargando(true);
    const { error: err, usuario } = await registrarse(email, password);

    if (err || !usuario) {
      setError(err ?? "Error al crear la cuenta.");
      setCargando(false);
      return;
    }

    // Inicializar datos del usuario (categorías + preferencias)
    try {
      await inicializacionUsuarioService.inicializar(usuario.id);
    } catch {
      // No bloquear si falla; se reintentará al abrir la app
    }

    router.push("/app/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12 bg-white max-w-mobile mx-auto">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-brand-500 mb-4 shadow-lg shadow-brand-500/30">
          <span className="text-3xl">💰</span>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900">GastoLog</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-gray-900">Crear cuenta</h2>

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
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
            required
            className="px-4 py-3 rounded-2xl border-2 border-gray-200 bg-white text-sm outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-700">
            Confirmar contraseña
          </label>
          <input
            type="password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            placeholder="Repite tu contraseña"
            autoComplete="new-password"
            required
            className={cn(
              "px-4 py-3 rounded-2xl border-2 bg-white text-sm outline-none transition-colors",
              confirmar && confirmar !== password
                ? "border-red-400 focus:border-red-400"
                : "border-gray-200 focus:border-brand-500"
            )}
          />
          {confirmar && confirmar !== password && (
            <p className="text-xs text-red-500">Las contraseñas no coinciden</p>
          )}
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={terminos}
            onChange={(e) => setTerminos(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-brand-500 rounded"
          />
          <span className="text-sm text-gray-600">
            Acepto los{" "}
            <span className="text-brand-600 font-semibold">
              términos y condiciones
            </span>{" "}
            del servicio.
          </span>
        </label>

        <button
          type="submit"
          disabled={cargando || !terminos}
          className={cn(
            "w-full py-4 rounded-2xl font-bold text-base mt-2",
            "bg-brand-500 text-white shadow-lg shadow-brand-500/30",
            "active:scale-95 transition-all",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {cargando ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-8">
        ¿Ya tienes cuenta?{" "}
        <Link href="/auth/login" className="text-brand-600 font-semibold">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
