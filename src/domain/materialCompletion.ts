import { rankMaterials, type RankData, type Recipe } from "./farming";
import { RANK_NAMES } from "./ranks";

type Character = { id: string; name: string };
type Unit = Character & { rank: number; upgrades?: number[] };
export type MaterialRecipient = Character & { owned: boolean; lifetime: number; remaining: number; direct: number; crafting: number };
export type MaterialCompletionRow = {
    id: string; name: string; rarity: string; craftable: boolean;
    inventory: number; remaining: number; required: number; allocated: number;
    shortage: number; surplus: number; unowned: number;
    status: "done-catalog" | "done-owned" | "stocked" | "farming" | "untracked";
    recipients: MaterialRecipient[];
};

/** Rank costs are the upgrades equipped AT a rank to reach the next rank.
 * The target is therefore exclusive, including its predecessor's six slots.
 * Completion is limited to this catalog/ceiling, never a promise about new content.
 */
export function materialCompletion({ catalog, roster, ranks, recipes, inventory, targetRank = RANK_NAMES.length - 1 }: {
    catalog: Character[]; roster: Unit[]; ranks: RankData; recipes: Record<string, Recipe>;
    inventory: Array<{ id: string; amount: number }> | undefined; targetRank?: number;
}): MaterialCompletionRow[] {
    if (!Number.isInteger(targetRank) || targetRank < 1 || targetRank >= RANK_NAMES.length)
        throw new Error("Choose a supported rank ceiling above Stone I.");
    if (inventory === undefined) throw new Error("Upgrade inventory unavailable. Refresh account data before calculating completion.");
    if (!catalog.length) throw new Error("Character catalog unavailable.");
    const characters = new Map(catalog.map(character => [character.id, character]));
    if (characters.size !== catalog.length) throw new Error("Duplicate character in catalog.");
    const owned = new Map<string, Unit>();
    for (const unit of roster) {
        if (!characters.has(unit.id)) continue; // Machines use a separate progression system.
        if (owned.has(unit.id)) throw new Error(`Duplicate owned character: ${unit.id}`);
        if (!Number.isInteger(unit.rank) || unit.rank < 0 || unit.rank >= RANK_NAMES.length)
            throw new Error(`${unit.name}: unknown rank`);
        owned.set(unit.id, unit);
    }
    const stock = new Map<string, number>();
    function add(map: Map<string, number>, id: string, count: number) {
        const total = (map.get(id) ?? 0) + count;
        if (!Number.isSafeInteger(total) || total < 0) throw new Error(`Invalid material count for ${id}`);
        map.set(id, total);
    }
    for (const item of inventory) {
        if (!Number.isSafeInteger(item.amount) || item.amount < 0) throw new Error(`Invalid inventory amount for ${item.id}`);
        add(stock, item.id, item.amount);
    }
    const available = new Map(stock);
    const uses = new Map<string, Map<string, MaterialRecipient>>();
    const required = new Map<string, number>(), allocated = new Map<string, number>(), shortage = new Map<string, number>();

    function visit(id: string, count: number, fn: (id: string, count: number, depth: number) => number, ancestors = new Set<string>()) {
        const recipe = recipes[id];
        if (ancestors.has(id)) throw new Error(`Recipe cycle at ${id}`);
        if (!recipe || recipe.snowprintId !== id) throw new Error(`Missing or mismatched material ID: ${id}`);
        if (recipe.material.toLowerCase() === "coming soon") throw new Error(`Unknown future recipe: ${id}`);
        if (!Number.isSafeInteger(count) || count <= 0) throw new Error(`Invalid material count for ${id}`);
        if (recipe.craftable && (!recipe.recipe?.length || recipe.recipe.some(part => !Number.isSafeInteger(part.count) || part.count <= 0)))
            throw new Error(`Invalid crafting recipe: ${id}`);
        const expand = fn(id, count, ancestors.size);
        if (recipe.craftable && expand) for (const part of recipe.recipe!)
            visit(part.material, expand * part.count, fn, new Set([...ancestors, id]));
    }

    for (const character of [...catalog].sort((a, b) => a.id.localeCompare(b.id))) {
        const unit = owned.get(character.id);
        const goal = { ...character, currentRank: unit?.rank ?? 0, targetRank, ...(unit?.upgrades === undefined ? {} : { upgrades: unit.upgrades }), priority: 0 };
        const full = rankMaterials({ ...goal, currentRank: 0, upgrades: [] }, ranks);
        // Missing equipped-slot data remains an error for unfinished owned characters.
        const remaining = rankMaterials(unit ? goal : { ...goal, upgrades: [] }, ranks);
        function record(id: string, count: number, depth: number, lifetime: boolean) {
            const recipients = uses.get(id) ?? new Map<string, MaterialRecipient>();
            const recipient = recipients.get(character.id) ?? { id: character.id, name: character.name, owned: !!unit, lifetime: 0, remaining: 0, direct: 0, crafting: 0 };
            if (lifetime) recipient.lifetime += count;
            else {
                recipient.remaining += count;
                if (depth === 0) recipient.direct += count;
                else recipient.crafting += count;
            }
            recipients.set(character.id, recipient);
            uses.set(id, recipients);
            return count;
        }
        for (const id of full) visit(id, 1, (id, count, depth) => record(id, count, depth, true));
        for (const id of remaining) visit(id, 1, (id, count, depth) => record(id, count, depth, false));
        if (unit) for (const id of remaining) visit(id, 1, (id, count) => {
            add(required, id, count);
            const take = Math.min(count, available.get(id) ?? 0);
            available.set(id, (available.get(id) ?? 0) - take);
            add(allocated, id, take);
            add(shortage, id, count - take);
            return count - take;
        });
    }
    return [...new Set([...uses.keys(), ...stock.keys()])].map(id => {
        const recipients = [...(uses.get(id)?.values() ?? [])].sort((a, b) => Number(b.owned) - Number(a.owned) || b.remaining - a.remaining || a.name.localeCompare(b.name));
        const remaining = recipients.filter(recipient => recipient.owned).reduce((sum, recipient) => sum + recipient.remaining, 0);
        const unowned = recipients.filter(recipient => !recipient.owned).reduce((sum, recipient) => sum + recipient.remaining, 0);
        const deficit = shortage.get(id) ?? 0;
        const status: MaterialCompletionRow["status"] = !uses.has(id) ? "untracked" : remaining === 0 ? (unowned === 0 ? "done-catalog" : "done-owned") : deficit === 0 ? "stocked" : "farming";
        return { id, name: recipes[id]?.material ?? id, rarity: recipes[id]?.rarity ?? "Unknown", craftable: recipes[id]?.craftable ?? false,
            inventory: stock.get(id) ?? 0, remaining, required: required.get(id) ?? 0, allocated: allocated.get(id) ?? 0,
            shortage: deficit, surplus: available.get(id) ?? 0, unowned, status, recipients };
    }).sort((a, b) => a.name.localeCompare(b.name));
}
