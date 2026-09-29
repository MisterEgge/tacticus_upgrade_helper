"use client";
import { useEffect, useMemo, useState } from "react";
import CharacterName from "../components/CharacterName";
import { totalBadgeCosts, type BadgeRarity } from "../../src/domain/abilityCosts";
import { budgetForRow, eligibleForBudget, type BudgetRow, type BudgetScope } from "../../src/domain/abilityBudget";
import { rankName } from "../../src/domain/ranks";
import { formatAbilityTarget } from "../../src/domain/targetDisplay";
import { WAR_PLAN_STORAGE_KEY, warBadgeTargets, type WarBadgeTeam, type WarBudgetScope } from "../../src/domain/warBadgeTargets";

const caps = [{level:17,label:"Uncommon · 17"},{level:26,label:"Rare · 26"},{level:35,label:"Epic · 35"},{level:50,label:"Legendary · 50"}];
const rarities:BadgeRarity[] = ["Common","Uncommon","Rare","Epic","Legendary","Mythic"];
const rankFloors = [{level:0,label:"Any rank"},{level:9,label:"Silver I+"},{level:12,label:"Gold I+"},{level:15,label:"Diamond I+"}];

type Scope=BudgetScope|WarBudgetScope;
const isWarScope=(scope:Scope):scope is WarBudgetScope=>scope.startsWith("war-");

export default function AbilityBadgeBudget({rows,defenseTeams,offenseTeams}:{rows:BudgetRow[];defenseTeams:WarBadgeTeam[];offenseTeams:WarBadgeTeam[]})
{
    const [cap,setCap] = useState(17);
    const [scope,setScope] = useState<Scope>("useful");
    const [minRank,setMinRank] = useState(0);
    const [open,setOpen] = useState<string|null>("Imperial");
    const [savedPlan,setSavedPlan] = useState<unknown>(null);
    useEffect(()=>{
        const read=()=>{try{setSavedPlan(JSON.parse(window.localStorage.getItem(WAR_PLAN_STORAGE_KEY)??"null"));}catch{setSavedPlan(null);}};
        read();window.addEventListener("storage",read);return()=>window.removeEventListener("storage",read);
    },[]);
    const selectedWarTargets=useMemo(()=>isWarScope(scope)?warBadgeTargets(defenseTeams,offenseTeams,savedPlan,scope):new Map<string,number>(),[defenseTeams,offenseTeams,savedPlan,scope]);
    const groups = useMemo(() => ["Imperial","Xenos","Chaos"].map(alliance => {
        const members = rows.filter(row => row.alliance === alliance && (isWarScope(scope)?selectedWarTargets.has(row.name):eligibleForBudget(row,scope,minRank)))
            .map(row => {const warTarget=selectedWarTargets.get(row.name);const goal=warTarget?{...row,activeTarget:warTarget,passiveTarget:warTarget}:row;return {...goal,...budgetForRow(goal,warTarget??cap),warTarget};})
            .filter(row => Object.values(row.planned).some(amount => amount > 0));
        return {alliance,members,planned:totalBadgeCosts(members.map(row => row.planned)),eligible:totalBadgeCosts(members.map(row => row.eligible))};
    }),[rows,cap,scope,minRank,selectedWarTargets]);

    return <><div className="abilityViews">
        <label>Include<select value={scope} onChange={event => setScope(event.target.value as Scope)}>
            <option value="useful">Pretty good and above</option><option value="top">Top tier and main raid</option><option value="raid">Main raid team only</option>
            <option value="war-defense">Selected War defense</option><option value="war-offense">Selected War offense</option><option value="war-both">War defense + offense</option>
        </select></label>
        {!isWarScope(scope)?<><label>Current rank<select value={minRank} onChange={event => setMinRank(Number(event.target.value))}>{rankFloors.map(option => <option key={option.level} value={option.level}>{option.label}</option>)}</select></label>
        <label>Plan through<select value={cap} onChange={event => setCap(Number(event.target.value))}>{caps.map(option => <option key={option.level} value={option.level}>{option.label}</option>)}</select></label></>:null}
    </div>
        <p className="sub">{isWarScope(scope)?"War totals use your saved buildable lineups. Defense slots 1–2 target 35/35; later slots target 26/26. Offense uses each slot’s Gold or Silver target. A character selected on both sides counts once at the higher target. If no plan is saved, the War planner’s default distinct teams are used.":"Pretty good includes characters in your community priority table (score 2.7+) or account priority 68+, plus the selected main raid team. The top tier uses score 3.5+ or priority 90+, plus that team. Characters without these signals are excluded. Rank narrows the current roster; it does not gate ability levels."}</p>
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
                    <td><CharacterName name={row.name} id={row.id}/><small>{rankName(row.rank)} · {row.rarity} · {row.warTarget ? `War target ${row.warTarget}/${row.warTarget}` : row.mainRaid ? "Main raid" : row.communityScore!==null ? `Community ${row.communityScore}` : `Account priority ${row.accountPriority}`}</small>{!row.warTarget?<small>{row.reviewed ? "Community ability target" : row.recommended ? "Planning recommendation" : "Provisional ability target"}</small>:null}</td>
                    <td>{formatAbilityTarget(row.activeLevel,row.activeTarget)}</td><td>{formatAbilityTarget(row.passiveLevel,row.passiveTarget)}</td>
                    <td>{rarities.filter(rarity => (row.planned[rarity]??0)>0).map(rarity => <small key={rarity}>{row.planned[rarity]} {rarity} · {row.eligible[rarity]??0} level eligible</small>)}</td>
                </tr>)}</tbody>
            </table></div> : <p className="sub">No selected characters need badges through this tier.</p>}</div> : null}
        </section>)}</div>
        <p className="sub">Level eligible uses current XP and rarity caps. It does not check badge or coin inventory. Higher targets stay in the planned total for later.</p>
    </>;
}
