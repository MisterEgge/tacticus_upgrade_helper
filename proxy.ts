import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "./src/server/supabaseConfig";

const publicPaths = new Set(["/login", "/signup", "/forgot-password"]);

export async function proxy(request: NextRequest)
{

    const config = getSupabasePublicConfig();
    if (!config) return NextResponse.next({ request });

    let response = NextResponse.next({ request });
    const supabase = createServerClient(config.url, config.publishableKey, {
        cookies: {
            getAll: () => request.cookies.getAll(),
            setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>)
            {

                cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                response = NextResponse.next({ request });
                cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));

            }
        }
    });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) console.error("Could not verify Supabase session.", error.message);

    const pathname = request.nextUrl.pathname;
    if (pathname.startsWith("/api/"))
    {

        if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
        if (pathname === "/api/sync" || pathname === "/api/raid-selection") return response;
        return NextResponse.json({ error: "Per-user account APIs are not enabled yet." }, { status: 503 });

    }

    if (pathname === "/auth/callback") return response;
    if (publicPaths.has(pathname))
    {

        return user ? NextResponse.redirect(new URL("/settings", request.url)) : response;

    }
    if (pathname === "/reset-password" && user) return response;
    if (!user)
    {

        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
        return NextResponse.redirect(loginUrl);

    }
    if (pathname !== "/settings")
    {

        const { data: account, error: accountError } = await supabase
            .from("user_game_credentials")
            .select("synced_at")
            .eq("user_id", user.id)
            .maybeSingle();
        if (accountError && accountError.code !== "42P01" && accountError.code !== "PGRST205")
            console.error("Could not check the signed-in user's account setup.", accountError.message);
        if (!account?.synced_at) return NextResponse.redirect(new URL("/settings", request.url));

    }
    return response;

}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"]
};
