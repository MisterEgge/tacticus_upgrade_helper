"use client";

import Link from "next/link";
import CharacterName from "../../components/CharacterName";
import type { CounterCharacter, GuildWarCounterKnowledge, GuildWarDefenseCohort } from "../../../src/domain/guildWarCounters";

export default function DefenseCohortCard({
    cohort,
    characters,
    knowledge,
    sharedDefenders
}: {
    cohort: GuildWarDefenseCohort;
    characters: CounterCharacter[];
    knowledge: GuildWarCounterKnowledge;
    sharedDefenders?: string[];
})
{

    const roster = new Map(characters.map(character => [character.id, character]));
    const attackCores = [...cohort.attackCores].sort((a, b) => b.wins / b.attempts - a.wins / a.attempts || b.attempts - a.attempts);
    const sourceLinks = cohort.sourceIds.map((id, index) =>
    {

        const source = knowledge.sources[id]!;
        return <span key={id}>{index ? " · " : ""}<a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></span>;

    });

    return <article className="warDefenseCohortCard">
        <h3>{cohort.name} defense cohort</h3>
        {sharedDefenders ? <p><strong>Shared defenders: {sharedDefenders.length}/5</strong> — {sharedDefenders.map(id => roster.get(id)?.name ?? id).join(", ")}.</p> : null}
        <p>Attack logs from Seasons 25–27 (BF4–5) were grouped against defenses sharing at least {cohort.minimumSharedDefenders} of these five defenders. Results are not adjusted for tier, map, power, opponent choice, or repeated wars; this is not a prediction for the selected defense.</p>
        <p>The report does not isolate this exact defense or split results by Gold/Silver tier.</p>
        <p>Reported defense failure rate: {(cohort.defenseFailures / cohort.defenseAttempts * 100).toFixed(1)}% ({cohort.defenseFailures}/{cohort.defenseAttempts}); {cohort.mostCommonBattlefield} was most common ({cohort.mostCommonBattlefieldShare}%); most common Machine of War: {cohort.mostCommonMachine}.</p>
        <div className="warCounterCoreList">{attackCores.map(core => <section key={core.name}>
            <header><h4>{core.name}</h4><strong>{(core.wins / core.attempts * 100).toFixed(1)}% clears · {core.wins}/{core.attempts}</strong></header>
            <div className="warCounterTeamMembers">{core.unitIds.map(id =>
            {

                const character = roster.get(id)!;
                return <Link key={id} href={`/characters/${id}`}><CharacterName name={character.name} id={id} icon={character.icon}/></Link>;

            })}</div>
            <small>{core.supported ? "Meets the source's supported-sample label" : "Below the source's supported-sample label"} · The source defines supported as at least 30 attacks across 10 wars. Attack core only; other attackers may be unspecified.</small>
        </section>)}</div>
        <small className="warCounterSources">Sources: {sourceLinks}</small>
    </article>;

}
