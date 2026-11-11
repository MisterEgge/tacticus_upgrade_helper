import Link from "next/link";
import Nav from "../../components/Nav";
import { getCharacterCatalog } from "../../lib/catalog";
import GuildWarCounterGuide from "./GuildWarCounterGuide";
import { readFile } from "node:fs/promises";
import { findGuildWarMechanicCounterOptions, validateGuildWarCounterKnowledge, type GuildWarCounterKnowledge } from "../../../src/domain/guildWarCounters";

export default async function GuildWarCounters()
{

    const [catalog, knowledgeText] = await Promise.all([
        getCharacterCatalog(),
        readFile("config/guild_war_counters.json", "utf8")
    ]);
    const knowledge = JSON.parse(knowledgeText) as GuildWarCounterKnowledge;
    validateGuildWarCounterKnowledge(catalog.characters, knowledge);
    const coveredDefenders = catalog.characters.filter(character => findGuildWarMechanicCounterOptions(character, catalog.characters, knowledge.mechanicRules).length > 0).length;

    return <main>
        <Nav/>
        <header><div>
            <p className="eyebrow">GUILD WAR</p>
            <h1>Guild War offense planner</h1>
            <p className="sub">Enter any opposing lineup or browse all {catalog.characters.length} defenders. Sourced mechanic matches explain useful interactions; they are kept separate from proven Guild War results. {coveredDefenders} of {catalog.characters.length} characters currently have at least one sourced mechanic lead. The database includes {knowledge.mechanicRules.length} matchup rules, {knowledge.teamMatchups.length} exact team matchups, and {knowledge.defenseCohorts.length} broader defense cohorts.</p>
            <p className="sub"><Link href="/war-defense">Back to Guild War planner</Link></p>
        </div></header>
        <GuildWarCounterGuide characters={catalog.characters} knowledge={knowledge}/>
    </main>;

}
