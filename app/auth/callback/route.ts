import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "../../lib/supabase/server";

function safeNextPath(value: string | null): string
{

    if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/settings";
    return value;

}

export async function GET(request: NextRequest)
{

    const code = request.nextUrl.searchParams.get("code");
    const next = safeNextPath(request.nextUrl.searchParams.get("next"));
    if (!code) return NextResponse.redirect(new URL("/login?error=verification", request.url));

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/login?error=verification", request.url));
    return NextResponse.redirect(new URL(next, request.url));

}
