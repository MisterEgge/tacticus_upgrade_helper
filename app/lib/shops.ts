import { readFile } from "node:fs/promises";
import {shopAccountContext,type ShopCatalog} from "../../src/domain/shops";
import {getReport} from "./report";

export async function getShopCatalog(): Promise<ShopCatalog | null>
{

    try
    {

        const [text,report]=await Promise.all([readFile("data/game/shops.json", "utf8"),getReport()]);
        const catalog = JSON.parse(text) as ShopCatalog;
        if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.shops)) return null;
        return {...catalog,accountContext:shopAccountContext(report?.roster??null,report?.source.powerLevel??null)};

    }
    catch { return null; }

}

export async function getEquipmentCharacters() {
 try {
  const data=JSON.parse(await readFile("data/game/equipment-characters.json","utf8")) as {sourceCommit:string;characters:import("../../src/domain/equipmentCompatibility").EquipmentCharacter[]};
  return data;
 } catch {return null;}
}
