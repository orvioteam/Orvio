import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedPaths = ["/dashboard", "/customers", "/employees", "/jobs", "/schedule", "/settings"];
const publicOnlyPaths = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const shouldDebugAuth = process.env.NODE_ENV === "development"
    && (pathname === "/dashboard" || pathname.startsWith("/dashboard/") || pathname === "/login");

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    if (shouldDebugAuth) {
      console.error("[auth-debug] PROXY: Supabase environment is missing", JSON.stringify({ pathname }));
    }
    return NextResponse.next();
  }

  const response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set({ name, value, ...options });
            response.cookies.set({ name, value, ...options });
          });
        },
      },
    },
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  const isMissingSession = error instanceof Error && error.name === "AuthSessionMissingError";
  if (shouldDebugAuth) {
    console.info("[auth-debug] PROXY: getUser result", JSON.stringify({
      pathname,
      userPresent: Boolean(user),
      userId: user?.id.slice(0, 8) ?? null,
      errorMessage: error?.message ?? null,
    }));
  }
  if (error && !isMissingSession) {
    if (shouldDebugAuth) {
      console.error("[auth-debug] PROXY: getUser failed; leaving request unredirected", JSON.stringify({
        pathname,
        errorMessage: error.message,
      }));
    } else {
      console.error("Supabase session verification failed in proxy.", error.message);
    }
    return response;
  }
  const authenticatedUser = isMissingSession ? null : user;

  const isProtectedPath = protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const isPublicOnlyPath = publicOnlyPaths.includes(pathname);

  if (!authenticatedUser && isProtectedPath) {
    if (shouldDebugAuth) {
      console.warn("[auth-debug] PROXY: denying protected request; redirecting to /login", JSON.stringify({ pathname }));
    }
    const loginUrl = new URL("/login", request.url);
    const redirectResponse = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  if (authenticatedUser && isPublicOnlyPath) {
    if (shouldDebugAuth) {
      console.info("[auth-debug] PROXY: authenticated public-only route; redirecting to /dashboard", JSON.stringify({ pathname }));
    }
    const dashboardUrl = new URL("/dashboard", request.url);
    const redirectResponse = NextResponse.redirect(dashboardUrl);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  if (shouldDebugAuth && pathname.startsWith("/dashboard") && authenticatedUser) {
    console.info("[auth-debug] DASHBOARD: proxy allows authenticated request", JSON.stringify({
      pathname,
      userId: authenticatedUser.id.slice(0, 8),
    }));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
