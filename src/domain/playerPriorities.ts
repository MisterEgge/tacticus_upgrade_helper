export const PRIORITY_MODES = ["campaign", "raid", "war"] as const;
export type PriorityMode = typeof PRIORITY_MODES[number];
export const PRIORITY_LABELS: Record<PriorityMode, string> = {campaign: "Unfinished campaigns", raid: "Guild Raid", war: "Guild War"};
export type PlayerPriorities = {version: 1; modes: PriorityMode[]; characters: string[]};
export const DEFAULT_PRIORITIES: PlayerPriorities = {version: 1, modes: ["campaign", "raid", "war"], characters: []};

/** Reject malformed saves rather than quietly re-enabling an excluded mode. */
export function parsePlayerPriorities(value: unknown): PlayerPriorities | null {
    if (!value || typeof value !== "object") return null;
    const row = value as Record<string, unknown>;
    if (row.version !== 1 || !Array.isArray(row.modes) || row.modes.length > 3 || !row.modes.every(mode => PRIORITY_MODES.includes(mode as PriorityMode))
        || new Set(row.modes).size !== row.modes.length || !Array.isArray(row.characters) || row.characters.length > 30
        || !row.characters.every(id => typeof id === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(id)) || new Set(row.characters).size !== row.characters.length) return null;
    return {version: 1, modes: [...row.modes] as PriorityMode[], characters: [...row.characters] as string[]};
}

export function characterPlanningPriority(preferences: PlayerPriorities, id: string, roles: readonly PriorityMode[]): number {
    const pin = preferences.characters.indexOf(id);
    if (pin >= 0) return 40000 + (30 - pin) * 100;
    const index = preferences.modes.findIndex(mode => roles.includes(mode));
    return index < 0 ? 0 : (3 - index) * 10000;
}

/** War teams are editable in the browser; use the currently selected membership. */
export function priorityWithWarSelection(utility: {planningPriority?:number;planningModes?:PriorityMode[];planningRoles?:PriorityMode[];pinned?:boolean}, war: boolean): number | undefined {
    if(utility.planningPriority===undefined||!utility.planningRoles||utility.pinned)return utility.planningPriority;
    const roles=[...utility.planningRoles.filter(mode=>mode!=="war"),...(war?["war" as const]:[])];
    return characterPlanningPriority({version:1,modes:utility.planningModes??[],characters:[]},"",roles);
}
