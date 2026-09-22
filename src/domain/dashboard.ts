export type DashboardGearRow = { character: string; accountPriority: number };
export type DashboardAbilityRow = { character: string; accountPriority: number; activeLevel: number; passiveLevel: number; activeTo17: boolean; passiveTo17: boolean };
export type DashboardFocus = { character: string; priority: number; equipmentSlots: number; abilitySteps: Array<{ name: "Active" | "Passive"; level: number }> };

export function dashboardFocus(gearRows: DashboardGearRow[], abilityRows: DashboardAbilityRow[]): DashboardFocus[]
{

    const byCharacter = new Map<string, DashboardFocus>();
    function focusFor(character: string, priority: number): DashboardFocus
    {

        const existing = byCharacter.get(character);
        if (existing)
        {

            existing.priority = Math.max(existing.priority, priority);
            return existing;

        }
        const created: DashboardFocus = { character, priority, equipmentSlots: 0, abilitySteps: [] };
        byCharacter.set(character, created);
        return created;

    }
    for (const row of gearRows) focusFor(row.character, row.accountPriority).equipmentSlots += 1;
    for (const row of abilityRows)
    {

        const focus = focusFor(row.character, row.accountPriority);
        if (row.activeTo17) focus.abilitySteps.push({ name: "Active", level: row.activeLevel });
        if (row.passiveTo17) focus.abilitySteps.push({ name: "Passive", level: row.passiveLevel });

    }
    return [...byCharacter.values()].sort((a, b) => b.priority - a.priority || b.equipmentSlots - a.equipmentSlots || a.character.localeCompare(b.character));

}
