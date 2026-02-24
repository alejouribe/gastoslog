"use client";

export function PantallaCarga() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30 animate-pulse">
          <span className="text-3xl">💰</span>
        </div>
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
        <p className="text-sm text-gray-400 mt-2">Cargando...</p>
      </div>
    </div>
  );
}
