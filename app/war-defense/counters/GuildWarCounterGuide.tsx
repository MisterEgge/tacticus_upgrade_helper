"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import CharacterName from "../../components/CharacterName";
import ViewTabs from "../../components/ViewTabs";
import DefenseCohortCard from "./DefenseCohortCard";
import { findGuildWarDefenseCohorts, findGuildWarMechanicCounterOptions, findGuildWarTeamMatchups, type GuildWarCounterKnowledge } from "../../../src/domain/guildWarCounters";

type Character = { id: string; name: string; fullName: string; faction: string; icon: string; traits: string[] };

function sourceList(sourceIds: string[], knowledge: GuildWarCounterKnowledge)
{

    return <small className="warCounterSources">Sources: {sourceIds.map((id, index) =>
    {

        const source = knowledge.sources[id]!;
        return <span key={id}>{index ? " · " : ""}<a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></span>;

    })}</small>;

}

export default function GuildWarCounterGuide({ characters, knowledge }: { characters: Character[]; knowledge: GuildWarCounterKnowledge })
{

    const [query, setQuery] = useState("");
    const [faction, setFaction] = useState("all");
    const [selectedDefender, setSelectedDefender] = useState(characters.find(character => character.id === "blackTerminator")?.id ?? characters[0]?.id ?? "");
    const [defenseTier, setDefenseTier] = useState<"gold" | "silver">("gold");
    const [defenseIds, setDefenseIds] = useState<string[]>(Array(5).fill(""));
    const factions = useMemo(() => [...new Set(characters.map(character => character.faction).filter(Boolean))].sort(), [characters]);
    const mechanicRuleCounts = useMemo(() => new Map(characters.map(character => [
        character.id,
        findGuildWarMechanicCounterOptions(character, characters, knowledge.mechanicRules).length
    ] as const)), [characters, knowledge]);
    const filtered = useMemo(() => characters.filter(character =>
        (faction === "all" || character.faction === faction)
        && `${character.name} ${character.fullName} ${character.faction} ${character.traits.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase())
    ), [characters, faction, query]);
    const selected = characters.find(character => character.id === selectedDefender);
    const selectedDefenders = defenseIds.flatMap(id =>
    {

        const character = characters.find(entry => entry.id === id);
        return character ? [character] : [];

    });
    const counterEntry = knowledge.unitCounters.find(entry => entry.defenderId === selectedDefender);
    const counters = (counterEntry?.counters ?? []).map(counter => ({
        ...counter,
        character: characters.find(character => character.id === counter.unitId)!
    })).sort((a, b) => a.character.name.localeCompare(b.character.name));
    const mechanicNote = knowledge.mechanicNotes.find(entry => entry.defenderId === selectedDefender);
    const relatedDefenseCohorts = knowledge.defenseCohorts.filter(cohort => cohort.defenseIds.includes(selectedDefender));
    const matchingTeams = findGuildWarTeamMatchups(defenseIds.filter(Boolean), defenseTier, knowledge.teamMatchups);
    const matchingDefenseCohorts = findGuildWarDefenseCohorts(defenseIds.filter(Boolean), knowledge.defenseCohorts);
    const idToCharacter = new Map(characters.map(character => [character.id, character]));

    function setDefenseMember(index: number, id: string)
    {

        setDefenseIds(current => current.map((member, memberIndex) => memberIndex === index ? id : member));

    }

    function mechanicResults(defender: Character)
    {

        const matches = findGuildWarMechanicCounterOptions(defender, characters, knowledge.mechanicRules);
        if (!matches.length) return <p className="empty">No sourced mechanic rule is cataloged for this unit's current traits. That is a research gap, not evidence that no counter exists.</p>;
        return <div className="warMechanicResults">
            {matches.map(({ rule, candidateGroups }) => <article key={rule.id}>
                <h3>{rule.title}</h3>
                <small className="warMechanicMatchedTraits">{rule.defenderTraits.length ? `Matches ${rule.defenderTraits.map(trait => trait.replace(/([a-z])([A-Z])/g, "$1 $2")).join(", ")}` : `Specific to ${defender.name}`}</small>
                <p>{rule.rationale}</p>
                {candidateGroups.map(({ group, characters: candidates }) => <section key={group.label}>
                    <h4>{group.label}</h4>
                    <p>{group.rationale}</p>
                    {candidates.length ? <div className="warCounterTeamMembers">{candidates.map(character => <Link key={character.id} href={`/characters/${character.id}`}><CharacterName name={character.name} id={character.id} icon={character.icon}/></Link>)}</div> : null}
                    {sourceList(group.sourceIds, knowledge)}
                </section>)}
                <small className="warMechanicDisclaimer">Mechanic match only — not a tested Guild War result.</small>
                {sourceList(rule.sourceIds, knowledge)}
            </article>)}
        </div>;

    }

    const unitView = <section className="panel warCounterPanel">
        <div className="warCounterFilters">
            <label>Find a defender<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Character or trait"/></label>
            <label>Faction<select value={faction} onChange={event => setFaction(event.target.value)}><option value="all">All factions</option>{factions.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        </div>
        <div className="warCounterLayout">
            <div className="warCounterRoster" aria-label="Defending units">
                <p className="sub">{filtered.length} of {characters.length} units</p>
                {filtered.map(character => { const count = knowledge.unitCounters.find(entry => entry.defenderId === character.id)?.counters.length ?? 0; const rules = mechanicRuleCounts.get(character.id) ?? 0; return <button type="button" className={selectedDefender === character.id ? "active" : ""} key={character.id} onClick={() => setSelectedDefender(character.id)}><CharacterName name={character.name} id={character.id} icon={character.icon}/><span>{count ? `${count} counter ${count === 1 ? "entry" : "entries"}` : rules ? `${rules} mechanic rule${rules === 1 ? "" : "s"}` : "Research gap"}</span></button>; })}
                {!filtered.length ? <p className="empty">No units match those filters.</p> : null}
            </div>
            <div className="warCounterDetails">
                {selected ? <><header className="warCounterUnitHeader"><CharacterName name={selected.name} id={selected.id} icon={selected.icon}/><small>{selected.faction}</small></header>
                    {mechanicNote ? <aside className="warCounterMechanic"><strong>Tactical note — not a verified counter</strong><p>{mechanicNote.note}</p><small className="warCounterConfidence">{mechanicNote.confidence} confidence</small>{sourceList([mechanicNote.sourceId], knowledge)}</aside> : null}
                    <h2>Mechanic-based options</h2>{mechanicResults(selected)}
                    {counters.length ? <ul className="warCounterList">{counters.map(counter => <li key={counter.unitId}>
                        <Link href={`/characters/${counter.character.id}`}><CharacterName name={counter.character.name} id={counter.character.id} icon={counter.character.icon}/></Link>
                        <p>{counter.rationale}</p><small className="warCounterConfidence">{counter.confidence} confidence</small>{sourceList(counter.sourceIds, knowledge)}
                    </li>)}</ul> : <p className="empty">No verified counter unit is cataloged for this defender yet. This is a research gap, not evidence that no counter exists.</p>}
                    {relatedDefenseCohorts.length ? <div className="warCounterRelated"><h3>Team-level evidence involving this defender</h3><p>These are results against the complete defense cohorts, not isolated counters to this character.</p>{relatedDefenseCohorts.map(cohort => <DefenseCohortCard key={cohort.name} cohort={cohort} characters={characters} knowledge={knowledge}/>)}</div> : null}
                </> : <p className="empty">Choose a defender to view researched counters.</p>}
            </div>
        </div>
    </section>;

    const teamView = <section className="panel warCounterPanel">
        <div className="warCounterTeamForm">
            <label>Defense tier<select value={defenseTier} onChange={event => setDefenseTier(event.target.value as "gold" | "silver")}><option value="gold">Gold</option><option value="silver">Silver</option></select></label>
            {defenseIds.map((id, index) => <label key={index}>Defender {index + 1}<select value={id} onChange={event => setDefenseMember(index, event.target.value)}><option value="">Choose a unit</option>{characters.map(character => <option key={character.id} value={character.id} disabled={defenseIds.some((current, currentIndex) => current === character.id && currentIndex !== index)}>{character.id === "deathRotbone" ? "Rotbone (Nauseous)" : character.name} · {character.faction}</option>)}</select></label>)}
            <button type="button" onClick={() => setDefenseIds(Array(5).fill(""))}>Clear team</button>
        </div>
        {selectedDefenders.length ? <div className="warCounterRelated">
            <h2>Mechanic-based options</h2>
            <p>Enter any number of defenders. Suggestions are based on sourced game rules and do not claim a Guild War win rate.</p>
            {selectedDefenders.map(defender => <section className="warDefenseMechanic" key={defender.id}>
                <h3><CharacterName name={defender.name} id={defender.id} icon={defender.icon}/><small>{defender.faction}</small></h3>
                {mechanicResults(defender)}
            </section>)}
        </div> : <p className="empty">Choose one or more defenders to see relevant game-mechanics options.</p>}
        {selectedDefenders.length === 5 ? <>
        <h2>Guild War lineup evidence</h2>
        {matchingTeams.length ? <div className="warCounterMatches">{matchingTeams.map((matchup, index) => <article key={`${matchup.defenseIds.join("-")}-${index}`}>
            <h2>Researched {defenseTier} matchup</h2>
            <div className="warCounterTeamMembers">{matchup.offenseIds.map(id => { const character = idToCharacter.get(id)!; return <Link key={id} href={`/characters/${id}`}><CharacterName name={character.name} id={id} icon={character.icon}/></Link>; })}</div>
            <p>{matchup.rationale}</p><small className="warCounterConfidence">{matchup.confidence} confidence</small>{sourceList(matchup.sourceIds, knowledge)}
        </article>)}</div> : <p className="empty">No exact five-versus-five result is cataloged for this defense and tier.</p>}
        {matchingDefenseCohorts.map(match => <DefenseCohortCard key={match.cohort.name} cohort={match.cohort} characters={characters} knowledge={knowledge} sharedDefenders={match.sharedDefenders}/>)}
        {!matchingTeams.length && !matchingDefenseCohorts.length ? <p className="empty">No exact or sufficiently similar defense cohort is cataloged yet.</p> : null}
        </> : selectedDefenders.length ? <p className="empty">Add the remaining defenders to search exact Guild War lineups and cohort results.</p> : null}
    </section>;

    return <ViewTabs label="Guild War counter guide" defaultTab="Build counter plan" tabs={[
        { label: "Build counter plan", content: teamView },
        { label: "By unit", content: unitView },
    ]}/>;

}
