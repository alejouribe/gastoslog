// ─── Utilidades generales ─────────────────────────────────────────────────────

/**
 * Combina clases de Tailwind de forma condicional (cn helper).
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Genera un UUID v4 compatible con browsers sin dependencias externas.
 * Se usa como id local antes de sincronizar con Supabase.
 */
export function generarUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback para entornos sin crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Espera N milisegundos (util para backoff en sync).
 */
export function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retorna el timestamp actual en ISO 8601.
 */
export function ahora(): string {
  return new Date().toISOString();
}

/**
 * Trunca un texto a maxLength caracteres, añadiendo "…" si se trunca.
 */
export function truncar(texto: string, maxLength: number): string {
  if (texto.length <= maxLength) return texto;
  return texto.slice(0, maxLength - 1) + "…";
}

/**
 * Verifica si el browser soporta IndexedDB.
 */
export function soportaIndexedDB(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

/**
 * Verifica si hay conexión a internet (combinando navigator.onLine con una probe).
 */
export function estaOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}
