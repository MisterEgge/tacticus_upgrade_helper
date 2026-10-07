import { NextResponse } from "next/server";
import { getRaidMeta, ownedRaidUnits, RAID_SELECTION_COOKIE } from "../../lib/raidSelection";
import { resolveRaidSelection, validateRaidSelection } from "../../../src/domain/raidSelection";
import { getReport } from "../../lib/report";

export async function POST(request: Request)
{
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid selection." }, { status: 400 }); }
    const teams = (await getRaidMeta()).bosses;
    const selection = validateRaidSelection(body, teams);
    if (!selection) return NextResponse.json({ error: "Choose a valid raid lineup." }, { status: 400 });
    const owned = ownedRaidUnits(await getReport());
    if (selection.lineup?.some(name => !owned.has(name)) || (selection.machine && !owned.has(selection.machine))) return NextResponse.json({ error: "Choose owned characters and a Machine of War you have unlocked." }, { status: 400 });
    const resolved = resolveRaidSelection(selection, teams, owned);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(RAID_SELECTION_COOKIE, JSON.stringify(resolved), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    return response;
}
