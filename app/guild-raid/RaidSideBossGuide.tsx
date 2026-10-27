import CharacterName from "../components/CharacterName";
import ReferenceDetails from "../components/ReferenceDetails";
import {raidSideBosses, SIDE_BOSSES_REVIEWED, SIDE_BOSS_MAPS, sideBossSource} from "../../src/domain/raidSideBosses";

export default function RaidSideBossGuide({boss}: {boss:string}) {
    const battles = raidSideBosses(boss);
    if (!battles) return <section className="panel detailPanel"><h2>Side bosses</h2><p>No researched side-boss guide for {boss} yet.</p></section>;
    return <section className="panel detailPanel raidSideBossGuide" aria-label={`${boss} side bosses`}>
        <h2>Side bosses</h2>
        <p className="sub">{battles.excludedFaction} cannot deploy. Pick the fight that removes your guild's next blocker; benefits unlock at health thresholds.</p>
        <div className="raidSideBossCards">{battles.bosses.map(battle => <article key={battle.page} aria-label={battle.name}>
            <h3><CharacterName name={battle.name} id={battle.portraitId}/></h3>
            <p className="raidBossRule">{battle.approach}</p>
            <ul>{battle.tips.map(tip=><li key={tip}>{tip}</li>)}</ul>
            <p className="raidSupportBenefit"><strong>Helps against {boss}: </strong>{battle.benefit}</p>
            <a href={sideBossSource(battle.page)} target="_blank" rel="noreferrer">Encounter mechanics &amp; thresholds</a>
        </article>)}</div>
        <ReferenceDetails label="Maps & sources">
            <p><a href={SIDE_BOSS_MAPS} target="_blank" rel="noreferrer">Open side-boss map gallery</a></p>
            <p className="sub">Mechanics checked {SIDE_BOSSES_REVIEWED} against the linked Guild Raid variants. Tips are tactical suggestions; check the current tier and map in-game. Support benefits accumulate across health thresholds, not all after one attack.</p>
            <a href="https://tacticus.wiki.gg/wiki/Guild_Raid" target="_blank" rel="noreferrer">Supporting battle rules</a>
        </ReferenceDetails>
    </section>;
}
