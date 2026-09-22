import { readFile } from "node:fs/promises";
import type { ShopCatalog } from "../../src/domain/shops";

export async function getShopCatalog(): Promise<ShopCatalog | null>
{

    try
    {

        const catalog = JSON.parse(await readFile("data/game/shops.json", "utf8")) as ShopCatalog;
        if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.shops)) return null;
        return catalog;

    }
    catch { return null; }

}
