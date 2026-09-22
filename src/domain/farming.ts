import { RANK_NAMES } from "./ranks";
export { RANK_NAMES } from "./ranks";
export type RankData = Record<string, Record<string, string[]>>;
export type Recipe = { material: string; snowprintId: string; rarity: string; stat: string; craftable: boolean; recipe?: Array<{ material: string; count: number }> };
export type RankGoal = { id: string; name: string; currentRank: number; targetRank: number; upgrades?: number[]; priority: number };

export function rankMaterials(goal: RankGoal, ranks: RankData): string[]
{

    if (![goal.currentRank, goal.targetRank].every(n => Number.isInteger(n) && n >= 0 && n < RANK_NAMES.length))
        throw new Error(`${goal.name}: unknown rank`);
    if (goal.targetRank <= goal.currentRank) return [];
    if (!goal.upgrades || goal.upgrades.some(n => !Number.isInteger(n) || n < 0 || n > 5))
        throw new Error(`${goal.name}: equipped upgrade slots unavailable; refresh account data`);
    const materials: string[] = [];
    for (let rank = goal.currentRank; rank < goal.targetRank; rank++)
    {

        const row = ranks[goal.id]?.[RANK_NAMES[rank]!];
        if (!row || row.length !== 6 || row.some(id => !id)) throw new Error(`${goal.name}: missing recipe for ${RANK_NAMES[rank]}`);
        materials.push(...row.filter((_, slot) => rank !== goal.currentRank || !goal.upgrades!.includes(slot)));

    }
    return materials;

}

function recipeFor(id: string, recipes: Record<string, Recipe>, ancestors: Set<string>): Recipe
{

    if (ancestors.has(id)) throw new Error(`Recipe cycle at ${id}`);
    const recipe = recipes[id];
    if (!recipe || recipe.snowprintId !== id) throw new Error(`Missing or mismatched material ID: ${id}`);
    if (recipe.craftable && (!recipe.recipe?.length || recipe.recipe.some(r => !Number.isInteger(r.count) || r.count <= 0)))
        throw new Error(`Invalid crafting recipe: ${id}`);
    return recipe;

}

export function expandMaterial(id: string, count: number, recipes: Record<string, Recipe>, out = new Map<string, number>(), ancestors = new Set<string>()): Map<string, number>
{

    if (!Number.isInteger(count) || count < 0) throw new Error(`Invalid material count: ${count}`);
    if (!count) return out;
    const recipe = recipeFor(id, recipes, ancestors);
    if (!recipe.craftable) out.set(id, (out.get(id) ?? 0) + count);
    else for (const part of recipe.recipe!) expandMaterial(part.material, count * part.count, recipes, out, new Set([...ancestors, id]));
    return out;

}

export function planMaterials(goals: RankGoal[], ranks: RankData, recipes: Record<string, Recipe>, inventory: Array<{ id: string; amount: number }>)
{

    const remaining = new Map<string, number>();
    for (const item of inventory)
    {

        if (!Number.isInteger(item.amount) || item.amount < 0) throw new Error(`Invalid inventory amount for ${item.id}`);
        remaining.set(item.id, (remaining.get(item.id) ?? 0) + item.amount);

    }
    const demand = new Map<string, { needed: number; owned: number; shortage: number; characters: Array<{ name: string; priority: number }> }>();
    const seen = new Set<string>();
    for (const goal of [...goals].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id)))
    {

        if (seen.has(goal.id)) throw new Error(`Duplicate character goal: ${goal.id}`);
        seen.add(goal.id);
        function consume(id: string, count: number, ancestors = new Set<string>())
        {

            const recipe = recipeFor(id, recipes, ancestors);
            const owned = Math.min(count, remaining.get(id) ?? 0);
            remaining.set(id, (remaining.get(id) ?? 0) - owned);
            const shortage = count - owned;
            if (recipe.craftable)
            {

                // Subtract finished upgrades AND intermediate ingredients before
                // expanding. One shared stock ledger serves every character.
                if (shortage) for (const part of recipe.recipe!) consume(part.material, shortage * part.count, new Set([...ancestors, id]));

            }
            else
            {

                const row = demand.get(id) ?? { needed: 0, owned: 0, shortage: 0, characters: [] };
                row.needed += count;
                row.owned += owned;
                row.shortage += shortage;
                if (shortage && !row.characters.some(c => c.name === goal.name)) row.characters.push({ name: goal.name, priority: goal.priority });
                demand.set(id, row);

            }

        }
        for (const id of rankMaterials(goal, ranks)) consume(id, 1);

    }
    return demand;

}
