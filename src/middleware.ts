import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Rutas de área autenticada
  if (pathname.startsWith("/app")) {
    if (!session) {
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
  }

  // Rutas públicas de auth → redirigir si ya tiene sesión
  if (
    pathname.startsWith("/auth/login") ||
    pathname.startsWith("/auth/registro")
  ) {
    if (session) {
      url.pathname = "/app/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/app/:path*",
    "/auth/login",
    "/auth/registro",
    "/",
  ],
};
