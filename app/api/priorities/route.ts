import {NextResponse} from "next/server";
import {parsePlayerPriorities} from "../../../src/domain/playerPriorities";
import {getSupabasePublicConfig} from "../../../src/server/supabaseConfig";
import {createSupabaseServerClient} from "../../lib/supabase/server";
import {getReport} from "../../lib/report";
import {PRIORITIES_COOKIE} from "../../lib/playerPriorities";

export async function POST(request: Request) {
    const url=new URL(request.url);
    // Next may normalize request.url to localhost even when the browser uses 127.0.0.1.
    const origin=`${url.protocol}//${request.headers.get("host")??url.host}`;
    if (request.headers.get("origin") !== origin) return NextResponse.json({error: "Save priorities from this app."}, {status: 403});
    let value: unknown;
    try {value = await request.json();} catch {return NextResponse.json({error: "Invalid priorities."}, {status: 400});}
    const preferences = parsePlayerPriorities(value);
    if (!preferences) return NextResponse.json({error: "Choose valid modes and up to 30 distinct characters."}, {status: 400});
    const supabase = getSupabasePublicConfig() ? await createSupabaseServerClient() : null;
    if (supabase) {
        const {data: {user}, error} = await supabase.auth.getUser();
        if (error || !user) return NextResponse.json({error: "Sign in to save priorities."}, {status: 401});
    }
    const report = await getReport();
    const owned = new Set(report?.roster.map(unit => unit.id) ?? []);
    if (preferences.characters.some(id => !owned.has(id))) return NextResponse.json({error: "Choose characters from your synced roster."}, {status: 400});
    if (supabase) {
        const {error} = await supabase.auth.updateUser({data: {tacticus_priorities: preferences}});
        if (error) return NextResponse.json({error: "Could not save priorities. Try again."}, {status: 503});
    }
    const response = NextResponse.json({ok: true});
    if (!supabase) response.cookies.set(PRIORITIES_COOKIE, JSON.stringify(preferences), {httpOnly: true, sameSite: "lax", secure: new URL(request.url).protocol === "https:", path: "/", maxAge: 60 * 60 * 24 * 365});
    return response;
}
