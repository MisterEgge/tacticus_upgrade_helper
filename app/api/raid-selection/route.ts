import { NextResponse } from "next/server";
import { getRaidMeta, RAID_SELECTION_COOKIE } from "../../lib/raidSelection";
import { validateRaidSelection } from "../../../src/domain/raidSelection";

export async function POST(request: Request)
{
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid selection." }, { status: 400 }); }
    const selection = validateRaidSelection(body, (await getRaidMeta()).bosses);
    if (!selection) return NextResponse.json({ error: "Choose a valid raid lineup." }, { status: 400 });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(RAID_SELECTION_COOKIE, JSON.stringify(selection), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    return response;
}
