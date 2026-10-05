import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedPaths = ["/dashboard", "/customers", "/employees", "/jobs", "/schedule", "/settings"];
const publicOnlyPaths = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
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
  if (error && !isMissingSession) {
    console.error("Supabase session verification failed in proxy.", error);
    return response;
  }
  const authenticatedUser = isMissingSession ? null : user;

  const pathname = request.nextUrl.pathname;
  const isProtectedPath = protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const isPublicOnlyPath = publicOnlyPaths.includes(pathname);

  if (!authenticatedUser && isProtectedPath) {
    const loginUrl = new URL("/login", request.url);
    const redirectResponse = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  if (authenticatedUser && isPublicOnlyPath) {
    const dashboardUrl = new URL("/dashboard", request.url);
    const redirectResponse = NextResponse.redirect(dashboardUrl);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
