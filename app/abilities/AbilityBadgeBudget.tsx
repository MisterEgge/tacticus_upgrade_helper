"use client";
import ResourceName from "../components/ResourceName";
import { useEffect, useMemo, useState } from "react";
import ReferenceDetails from "../components/ReferenceDetails";
import CharacterName from "../components/CharacterName";
import { totalBadgeCosts, type BadgeRarity } from "../../src/domain/abilityCosts";
import { budgetForRow, eligibleForBudget, type BudgetRow, type BudgetScope } from "../../src/domain/abilityBudget";
import { rankName } from "../../src/domain/ranks";
import { formatAbilityTarget } from "../../src/domain/targetDisplay";
import { WAR_PLAN_STORAGE_KEY, warBadgeTargets, type WarBadgeTeam, type WarBudgetScope } from "../../src/domain/warBadgeTargets";
import {badgeShortfalls,type AbilityBadgeInventory} from "../../src/domain/badgeInventory";

import {abilityBudgetNextStep} from "../../src/domain/abilityBudgetNextStep";

const caps = [{level:17,label:"Uncommon · 17"},{level:26,label:"Rare · 26"},{level:35,label:"Epic · 35"},{level:50,label:"Legendary · 50"}];
const rarities:BadgeRarity[] = ["Common","Uncommon","Rare","Epic","Legendary","Mythic"];
const rankFloors = [{level:0,label:"Any rank"},{level:9,label:"Silver I+"},{level:12,label:"Gold I+"},{level:15,label:"Diamond I+"}];

type Scope=BudgetScope|WarBudgetScope;
const isWarScope=(scope:Scope):scope is WarBudgetScope=>scope.startsWith("war-");

export default function AbilityBadgeBudget({rows,badgeInventory,defenseTeams,offenseTeams}:{rows:BudgetRow[];badgeInventory:AbilityBadgeInventory|null|undefined;defenseTeams:WarBadgeTeam[];offenseTeams:WarBadgeTeam[]})
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
        const planned=totalBadgeCosts(members.map(row => row.planned)),eligible=totalBadgeCosts(members.map(row => row.eligible));
        return {alliance,members,planned,eligible,badges:badgeShortfalls(badgeInventory,alliance,planned,eligible)};
    }),[rows,cap,scope,minRank,selectedWarTargets,badgeInventory]);

    return <><div className="abilityViews">
        <label>Include<select value={scope} onChange={event => setScope(event.target.value as Scope)}>
            <option value="useful">Useful and above</option><option value="situational">Situational and above</option><option value="top">Core only</option><option value="raid">Main raid team only</option>
            <option value="war-defense">Selected War defense</option><option value="war-offense">Selected War offense</option><option value="war-both">War defense + offense</option>
        </select></label>
        {!isWarScope(scope)?<><label>Current rank<select value={minRank} onChange={event => setMinRank(Number(event.target.value))}>{rankFloors.map(option => <option key={option.level} value={option.level}>{option.label}</option>)}</select></label>
        <label>Plan through<select value={cap} onChange={event => setCap(Number(event.target.value))}>{caps.map(option => <option key={option.level} value={option.level}>{option.label}</option>)}</select></label></>:null}
    </div>
        <ReferenceDetails label="How badge goals are calculated"><p>{isWarScope(scope)?"War totals use your saved buildable lineups. Defense slots 1–2 target 35/35; later slots target 26/26. Offense uses each slot’s Gold or Silver target. A character selected on both sides counts once at the higher target. If no plan is saved, the War planner’s default distinct teams are used.":"Useful includes relevant raid roles, unfinished campaign requirements, account priorities and the supplied community table. Situational also includes buildable War options and raid flex roles. See Character Ratings for every character and the exact signals. Rank narrows the current roster; it does not gate ability levels."}</p></ReferenceDetails>
        <div className="campaignInvestmentList">{groups.map(group => <section className="campaignInvestmentGroup" key={group.alliance}>
            <button className="campaignSectionToggle" aria-expanded={open === group.alliance} onClick={() => setOpen(open === group.alliance ? null : group.alliance)}>
                <div><p className="eyebrow">{group.members.length} CHARACTERS</p><h2>{group.alliance}</h2>
                    {group.badges.length?group.badges.map(badge=><p className="warSource" key={badge.rarity}><strong><ResourceName id={`badge:${group.alliance}:${badge.rarity}`} name={`${badge.rarity}: ${badge.owned??"?"} owned`}/></strong> · {badge.needed} needed · {badge.shortfall??"?"} short</p>):<p className="warSource">No badges needed for this goal</p>}</div>
                <div className="campaignSectionStatus"><span className="campaignChevron">{open === group.alliance ? "▴" : "▾"}</span></div>
            </button>
            {open === group.alliance ? <div className="campaignSectionBody"><div className="tableWrap"><table><thead><tr><th>Badge</th><th>Owned</th><th>Needed for goal</th><th>Still needed</th></tr></thead><tbody>{group.badges.map(badge=><tr key={badge.rarity}><td><strong><ResourceName id={`badge:${group.alliance}:${badge.rarity}`} name={badge.rarity}/></strong></td><td>{badge.owned??"Sync account"}</td><td>{badge.needed}</td><td><strong>{badge.shortfall??"—"}</strong></td></tr>)}</tbody></table></div>{group.members.length ? <div className="tableWrap"><table>
                <thead><tr><th>Character</th><th>Active</th><th>Passive</th><th>Badges to target</th><th>Next step</th></tr></thead>
                <tbody>{group.members.map(row => <tr key={row.id}>
                    <td><CharacterName name={row.name} id={row.id}/><small>{rankName(row.rank)} · {row.rarity} · {row.warTarget ? `War target ${row.warTarget}/${row.warTarget}` : row.utilityTier}</small>{!row.warTarget?<ReferenceDetails label="Target basis"><p>{row.reviewed ? "Community ability target" : row.recommended ? "Planning recommendation" : "Provisional ability target"}</p><p>{row.utilitySignals.join(" · ")}</p></ReferenceDetails>:null}</td>
                    <td>{formatAbilityTarget(row.activeLevel,row.activeTarget)}</td><td>{formatAbilityTarget(row.passiveLevel,row.passiveTarget)}</td>
                    <td>{rarities.filter(rarity => (row.planned[rarity]??0)>0).map(rarity => <small key={rarity}><ResourceName id={`badge:${group.alliance}:${rarity}`} name={`${row.planned[rarity]} ${rarity}`}/></small>)}</td><td>{abilityBudgetNextStep(row)}</td>
                </tr>)}</tbody>
            </table></div> : <p className="sub">No selected characters need badges through this tier.</p>}</div> : null}
        </section>)}</div>
        <p className="sub">Next steps respect XP and rarity. Check badges and coins before spending.</p>
    </>;
}
