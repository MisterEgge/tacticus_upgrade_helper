"use client";
import { useMemo, useState } from "react";
import CharacterName from "../components/CharacterName";
import { totalBadgeCosts, type BadgeRarity } from "../../src/domain/abilityCosts";
import { budgetForRow, eligibleForBudget, type BudgetRow, type BudgetScope } from "../../src/domain/abilityBudget";
import { rankName } from "../../src/domain/ranks";
import { formatAbilityTarget } from "../../src/domain/targetDisplay";

const caps = [{level:17,label:"Uncommon · 17"},{level:26,label:"Rare · 26"},{level:35,label:"Epic · 35"},{level:50,label:"Legendary · 50"}];
const rarities:BadgeRarity[] = ["Common","Uncommon","Rare","Epic","Legendary","Mythic"];
const rankFloors = [{level:0,label:"Any rank"},{level:9,label:"Silver I+"},{level:12,label:"Gold I+"},{level:15,label:"Diamond I+"}];

export default function AbilityBadgeBudget({rows}:{rows:BudgetRow[]})
{
    const [cap,setCap] = useState(17);
    const [scope,setScope] = useState<BudgetScope>("useful");
    const [minRank,setMinRank] = useState(0);
    const [open,setOpen] = useState<string|null>("Imperial");
    const groups = useMemo(() => ["Imperial","Xenos","Chaos"].map(alliance => {
        const members = rows.filter(row => row.alliance === alliance && eligibleForBudget(row,scope,minRank))
            .map(row => ({...row,...budgetForRow(row,cap)}))
            .filter(row => Object.values(row.planned).some(amount => amount > 0));
        return {alliance,members,planned:totalBadgeCosts(members.map(row => row.planned)),eligible:totalBadgeCosts(members.map(row => row.eligible))};
    }),[rows,cap,scope,minRank]);

    return <><div className="abilityViews">
        <label>Include<select value={scope} onChange={event => setScope(event.target.value as BudgetScope)}>
            <option value="useful">Pretty good and above</option><option value="top">Top tier and main raid</option><option value="raid">Main raid team only</option>
        </select></label>
        <label>Current rank<select value={minRank} onChange={event => setMinRank(Number(event.target.value))}>{rankFloors.map(option => <option key={option.level} value={option.level}>{option.label}</option>)}</select></label>
        <label>Plan through<select value={cap} onChange={event => setCap(Number(event.target.value))}>{caps.map(option => <option key={option.level} value={option.level}>{option.label}</option>)}</select></label>
    </div>
        <p className="sub">Pretty good includes characters in your community priority table (score 2.7+) or account priority 68+, plus the selected main raid team. The top tier uses score 3.5+ or priority 90+, plus that team. Characters without these signals are excluded. Rank narrows the current roster; it does not gate ability levels.</p>
        <div className="campaignInvestmentList">{groups.map(group => <section className="campaignInvestmentGroup" key={group.alliance}>
            <button className="campaignSectionToggle" aria-expanded={open === group.alliance} onClick={() => setOpen(open === group.alliance ? null : group.alliance)}>
                <div><p className="eyebrow">{group.members.length} CHARACTERS</p><h2>{group.alliance}</h2>
                    <p className="warSource"><strong>{group.planned.Uncommon??0} uncommon badges</strong> planned · {group.eligible.Uncommon??0} level eligible now</p>
                    <p className="warSource">{rarities.filter(rarity => rarity!=="Uncommon" && (group.planned[rarity]??0)>0).map(rarity => `${group.planned[rarity]} ${rarity}`).join(" · ") || "No other badges"}</p></div>
                <div className="campaignSectionStatus"><span className="campaignChevron">{open === group.alliance ? "▴" : "▾"}</span></div>
            </button>
            {open === group.alliance ? <div className="campaignSectionBody">{group.members.length ? <div className="tableWrap"><table>
                <thead><tr><th>Character</th><th>Active</th><th>Passive</th><th>Badges to target</th></tr></thead>
                <tbody>{group.members.map(row => <tr key={row.id}>
                    <td><CharacterName name={row.name} id={row.id}/><small>{rankName(row.rank)} · {row.rarity} · {row.mainRaid ? "Main raid" : row.communityScore!==null ? `Community ${row.communityScore}` : `Account priority ${row.accountPriority}`}</small><small>{row.reviewed ? "Community ability target" : row.recommended ? "Planning recommendation" : "Provisional ability target"}</small></td>
                    <td>{formatAbilityTarget(row.activeLevel,row.activeTarget)}</td><td>{formatAbilityTarget(row.passiveLevel,row.passiveTarget)}</td>
                    <td>{rarities.filter(rarity => (row.planned[rarity]??0)>0).map(rarity => <small key={rarity}>{row.planned[rarity]} {rarity} · {row.eligible[rarity]??0} level eligible</small>)}</td>
                </tr>)}</tbody>
            </table></div> : <p className="sub">No selected characters need badges through this tier.</p>}</div> : null}
        </section>)}</div>
        <p className="sub">Level eligible uses current XP and rarity caps. It does not check badge or coin inventory. Higher targets stay in the planned total for later.</p>
    </>;
}
