import Nav from "../components/Nav";
import {getPlayerPriorities} from "../lib/playerPriorities";
import {getReport} from "../lib/report";
import PriorityEditor from "./PriorityEditor";
import {getCharacterCatalog} from "../lib/catalog";

export default async function Priorities() {
    const [settings, report,catalog] = await Promise.all([getPlayerPriorities(), getReport(),getCharacterCatalog()]);
    const characterIds=new Set(catalog.characters.map(character=>character.id));
    return <main><Nav/><header><div><p className="eyebrow">YOUR PLAN</p><h1>Priorities</h1><p className="sub">Choose where your next resources should go.</p></div></header>
        <PriorityEditor initial={settings.preferences} configured={settings.configured} storage={settings.storage} characters={(report?.roster ?? []).filter(unit=>characterIds.has(unit.id)).map(unit => ({id: unit.id, name: unit.name, rank: unit.rank}))}/>
    </main>;
}
