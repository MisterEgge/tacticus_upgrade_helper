export type DashboardGearRow = { character: string };
/** Raid membership precedes readiness; missing gear counts do not set spending priority. */
export function rankAccountActions<T extends {name:string;actions:Array<{ready:boolean}>}>(rows:T[],raidNames:ReadonlySet<string>,planningScores?:Record<string,number>):T[]{
 return rows.filter(row=>row.actions.length>0&&(!planningScores||(planningScores[row.name]??0)>0)).sort((a,b)=>(planningScores?(planningScores[b.name]??0)-(planningScores[a.name]??0):Number(raidNames.has(b.name))-Number(raidNames.has(a.name)))||Number(b.actions.some(action=>action.ready))-Number(a.actions.some(action=>action.ready))||a.name.localeCompare(b.name));
}
export type DashboardAbilityRow = { character: string; activeLevel: number; passiveLevel: number; activeTo17: boolean; passiveTo17: boolean };
export type DashboardFocus = { character: string; equipmentSlots: number; abilitySteps: Array<{ name: "Active" | "Passive"; level: number }> };

export function dashboardFocus(gearRows: DashboardGearRow[], abilityRows: DashboardAbilityRow[]): DashboardFocus[]
{

    const byCharacter = new Map<string, DashboardFocus>();
    function focusFor(character: string): DashboardFocus
    {

        const existing = byCharacter.get(character);
        if (existing)
        {

            return existing;

        }
        const created: DashboardFocus = { character, equipmentSlots: 0, abilitySteps: [] };
        byCharacter.set(character, created);
        return created;

    }
    for (const row of gearRows) focusFor(row.character).equipmentSlots += 1;
    for (const row of abilityRows)
    {

        const focus = focusFor(row.character);
        if (row.activeTo17) focus.abilitySteps.push({ name: "Active", level: row.activeLevel });
        if (row.passiveTo17) focus.abilitySteps.push({ name: "Passive", level: row.passiveLevel });

    }
    return [...byCharacter.values()].sort((a, b) => b.equipmentSlots - a.equipmentSlots || b.abilitySteps.length - a.abilitySteps.length || a.character.localeCompare(b.character));

}
