import data from "../../config/raid_playbooks.json";

export type RaidAction = { character: string; kind: "active" | "attack"; text: string; condition: string };
export type RaidTurn = { turn: number; title: string; setup: string; actions: RaidAction[]; note: string };
type Replay = { url: string; creator: string; tier: string; map: string; lineup: string[]; machine: string };
type BossGuide = { rule: string; position: string; url: string; replay?: Replay };
export type RaidPlaybook = {
    available: boolean; reason: string; warnings: string[]; positions: { character: string; text: string }[];
    turns: RaidTurn[]; bossGuide: BossGuide | null; machineNote: string; replayMatches: boolean;
};
export const RAID_PLAYBOOK_SOURCES = data.sources;
export const RAID_PLAYBOOK_REVIEWED = data.reviewedOn;

// This is a conditional rotation, not a simulation of map movement, damage or boss AI.
// Never give a selected substitute another character's active or aura.
export function raidPlaybook(boss: string, teamName: string, lineup: string[], machine: string | null, firstBurst: 2 | 3 = 3): RaidPlaybook
{
    const bossGuide = (data.bosses as Record<string, BossGuide>)[boss] ?? null;
    const has = (name: string) => lineup.includes(name);
    const available = !!bossGuide && ["Big Hit", "Lavistodes", "Custodes"].includes(teamName)
        && lineup.length === 5 && new Set(lineup).size === 5 && has("Kariyan") && has("Trajann");
    const reason = !["Big Hit", "Lavistodes", "Custodes"].includes(teamName)
        ? "Turn orders for this archetype still need research. Use the boss replay library below."
        : !bossGuide ? "Boss-specific constraints still need research before a rotation can be offered."
        : lineup.length !== 5 || new Set(lineup).size !== 5
            ? "Select five distinct owned characters to build a battle guide."
            : !has("Kariyan") || !has("Trajann")
                ? "This rotation needs Kariyan and Trajann. The selected substitutes need a different playbook."
                : "Suggested rotation · checked mechanics; exact deployment tiles need a matching map replay.";
    const warnings: string[] = [];
    if (available && !has("Laviscus") && teamName !== "Custodes") warnings.push("Laviscus is absent: this is a Kariyan/Trajann rotation without Outrage or a Laviscus finisher.");
    if (available && !has("Aesoth")) warnings.push("Aesoth is absent: no Stand Vigil aura, and fewer repeatable actives to maintain Commander.");
    if (available && boss === "Magnus") warnings.push("The Gaze target may need to skip its listed attack; check survival before the burst.");
    const positions = available ? [
        { character: "Trajann", text: "Adjacent to the boss before the damage sequence. His extra hits require this adjacency, even when another character activates Commander." },
        { character: "Kariyan", text: "Adjacent to the boss; favour safe high ground. Stay within Aesoth's aura when he is selected." },
        ...(has("Laviscus") ? [{ character: "Laviscus", text: "Beside the boss before allies' non-psychic hits build Outrage. Preserve his normal attack until the finisher; favour safe high ground." }] : []),
        ...(has("Aesoth") ? [{ character: "Aesoth", text: "Next to Kariyan for the base aura. After a Custodes active, keep the damage dealers within 2 hexes of Aesoth. On his active turns he also needs an adjacent enemy." }] : []),
        ...(has("Gulgortz") ? [{ character: "Gulgortz", text: `${has("Laviscus") ? "Have Laviscus" : "Have the remaining melee attackers"} adjacent to Boss when WAAAGH! activates and a legal charge target. Leave Boss unmoved first if you want the Boyz summons.` }] : [])
    ] : [];
    const turns: RaidTurn[] = [];
    if (available) {
        const aesothTurns = firstBurst === 3 ? [2, 5] : [3, 6];
        const laviscusTurn = has("Aesoth") ? 6 : firstBurst === 3 ? 2 : 3;
        for (let turn = 1; turn <= 6; turn++) {
            const burst = turn === firstBurst || turn === firstBurst + 3;
            const activator = burst ? "Kariyan" : has("Aesoth") && aesothTurns.includes(turn) ? "Aesoth" : turn === 4 ? "Trajann" : has("Laviscus") && turn === laviscusTurn ? "Laviscus" : null;
            const actions: RaidAction[] = [];
            const used = new Set<string>();
            const active = (character: string, text: string, condition: string) => {
                actions.push({ character, kind: "active", text, condition });
                if (character !== "Laviscus") used.add(character);
            };
            if (activator === "Kariyan") active("Kariyan", "Martial Inspiration first → let Legacy of Combat resolve.", "Boss adjacent to Kariyan and Trajann. If it is ready and safe; this use sets up Commander for the follow-up.");
            if (activator === "Aesoth") active("Aesoth", "Vexilla Magnifica → let it resolve before other attacks.", "Aesoth adjacent to the boss, active ready; keep Kariyan within 2 hexes of Aesoth. The raid boss is Immune to the stun.");
            if (activator === "Trajann") active("Trajann", "Moment Shackle → heal and establish Commander before the damage sequence.", "Keep Trajann adjacent to the boss. Enemy-turn counterattacks do not receive Commander.");
            if (activator === "Laviscus") active("Laviscus", "Euphoric Strikes to establish Commander; save his normal attack.", "Laviscus beside the boss; his active does not end his turn. The next attack consumes its crit bonus.");
            if (turn === 6 && has("Gulgortz") && boss !== "Ghazghkull") active("Gulgortz", has("Laviscus") ? "WAAAGH! before Laviscus attacks." : "WAAAGH! before the remaining melee attacks.", `${has("Laviscus") ? "Laviscus" : "Remaining melee attackers"} adjacent to Boss at activation, with a charge target in range. Kariyan's active goes first if scheduled this turn.`);
            // Generic flex normals are a fallback, never an invented ability prescription.
            const order = ["Kariyan", ...lineup.filter(name => !["Kariyan", "Trajann", "Aesoth", "Laviscus"].includes(name)), "Trajann", "Aesoth"];
            const attacks = [...new Set(order)].filter(name => has(name) && !used.has(name));
            if (boss === "Ghazghkull" && has("Laviscus")) attacks.splice(used.has("Kariyan") ? 0 : 1, 0, "Laviscus");
            else if (has("Laviscus")) attacks.push("Laviscus");
            for (const character of attacks) {
                if (character === "Laviscus" && turn === laviscusTurn && activator !== "Laviscus") active("Laviscus", "Euphoric Strikes → immediately follow with his normal attack.", boss === "Ghazghkull" ? "Optional: only if the remaining attack allowance covers BOTH the active and finisher before damage reduction." : "Active unused and boss adjacent. Avoid an intervening attack consuming the crit bonus.");
                actions.push({ character, kind: "attack", text: character === "Laviscus" ? "Normal attack with accumulated Outrage." : character === "Kariyan" ? "Normal attack → let Legacy of Combat resolve." : "Normal attack.",
                    condition: character === "Laviscus" ? boss === "Ghazghkull" ? "Finish before low-value attacks use up the boss's allowance." : "Finisher: do not reset Outrage early." : character === "Kariyan" ? "Boss adjacent for the passive." : ["Trajann", "Aesoth"].includes(character) ? "" : "Flex active timing needs the matching replay." });
            }
            turns.push({ turn, title: burst ? "Kariyan burst" : turn === 1 ? "Reach the boss" : turn === 6 ? "Final attacks" : "Build damage / maintain buffs",
                setup: turn === 1 ? "Reach legal melee hexes. Attack with Kariyan if safe to begin his attack-turn ramp." : "Check boss telegraphs, then restore boss adjacency and aura range before activating abilities.",
                actions,
                note: turn === 1 ? "The opening may only allow positioning. If an active is delayed, adjust later cooldowns; this rotation assumes the scheduled actions actually happened."
                    : activator ? "Commander starts after the setup active resolves. If it cannot be used, this turn's extra-hit setup is not guaranteed."
                        : "No verified setup active in this rotation. Normal attacks can still deal damage; Commander is not guaranteed this turn." });
        }
    }
    const replay = bossGuide?.replay;
    return { available, reason, warnings, positions, turns, bossGuide,
        replayMatches: !!replay && lineup.length === 5 && replay.lineup.every(has) && machine === replay.machine,
        machineNote: machine ? `${machine}: exact activation turn and placement need the matching map replay; no machine action is assumed to trigger character Commander or Outrage.` : "No Machine of War selected." };
}
