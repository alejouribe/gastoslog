import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente de Supabase para uso en el navegador (Client Components).
 * Se crea una sola instancia por carga de página.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
