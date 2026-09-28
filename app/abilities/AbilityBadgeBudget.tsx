"use client";
import { useMemo, useState } from "react";
import CharacterName from "../components/CharacterName";
import { badgeCostBetween, totalBadgeCosts, type BadgeRarity } from "../../src/domain/abilityCosts";

type Row = { id:string; name:string; alliance:string; activeLevel:number|null; passiveLevel:number|null; activeTarget:number; passiveTarget:number; reviewed:boolean; recommended:boolean };
const caps = [{level:17,label:"Uncommon · level 17"},{level:26,label:"Rare · level 26"},{level:35,label:"Epic · level 35"},{level:50,label:"Legendary · level 50"}];
const rarities:BadgeRarity[] = ["Common","Uncommon","Rare","Epic","Legendary","Mythic"];
function levelPlan(current:number|null,target:number):string
{
    if(current===null)return `— → ${target}`;
    return current>=target?`${current} · already met`:`${current} → ${target}`;
}

export default function AbilityBadgeBudget({rows}:{rows:Row[]})
{
    const [cap,setCap] = useState(17);
    const [open,setOpen] = useState<string|null>("Imperial");
    const groups = useMemo(() => ["Imperial","Xenos","Chaos"].map(alliance => {
        const members = rows.filter(row => row.alliance === alliance).map(row => ({...row,
            activeTarget:Math.min(cap,row.activeTarget), passiveTarget:Math.min(cap,row.passiveTarget)
        })).filter(row => (row.activeLevel ?? Infinity) < row.activeTarget || (row.passiveLevel ?? Infinity) < row.passiveTarget);
        const costs = totalBadgeCosts(members.flatMap(row => [badgeCostBetween(row.activeLevel,row.activeTarget),badgeCostBetween(row.passiveLevel,row.passiveTarget)]));
        return {alliance,members,costs};
    }).filter(group => group.members.length),[rows,cap]);

    return <><div className="abilityViews"><label>Plan through<select value={cap} onChange={event => setCap(Number(event.target.value))}>
        {caps.map(option => <option key={option.level} value={option.level}>{option.label}</option>)}
    </select></label></div>
        <p className="sub">Totals include only owned characters below their recommended level. “Planning recommendation” is an editorial target where a community stopping point has not been established. XP and rarity may still block an upgrade.</p>
        <div className="campaignInvestmentList">{groups.map(group => <section className="campaignInvestmentGroup" key={group.alliance}>
            <button className="campaignSectionToggle" aria-expanded={open === group.alliance} onClick={() => setOpen(open === group.alliance ? null : group.alliance)}>
                <div><p className="eyebrow">{group.members.length} CHARACTERS</p><h2>{group.alliance} badge budget</h2>
                    <p className="warSource">{rarities.filter(rarity => (group.costs[rarity] ?? 0) > 0).map(rarity => `${group.costs[rarity]} ${rarity}`).join(" · ") || "No badges needed"}</p></div>
                <div className="campaignSectionStatus"><span className="campaignChevron">{open === group.alliance ? "▴" : "▾"}</span></div>
            </button>
            {open === group.alliance ? <div className="campaignSectionBody"><div className="tableWrap"><table>
                <thead><tr><th>Character</th><th>Active</th><th>Passive</th><th>Badge cost</th></tr></thead>
                <tbody>{group.members.map(row => {
                    const cost = totalBadgeCosts([badgeCostBetween(row.activeLevel,row.activeTarget),badgeCostBetween(row.passiveLevel,row.passiveTarget)]);
                    return <tr key={row.id}><td><CharacterName name={row.name} id={row.id}/><small>{row.reviewed ? "Character-specific community guidance" : row.recommended ? "Planning recommendation" : "Provisional baseline · research pending"}</small></td>
                        <td>{levelPlan(row.activeLevel,row.activeTarget)}</td><td>{levelPlan(row.passiveLevel,row.passiveTarget)}</td>
                        <td>{rarities.filter(rarity => (cost[rarity] ?? 0) > 0).map(rarity => <small key={rarity}>{cost[rarity]} {rarity}</small>)}</td></tr>;
                })}</tbody>
            </table></div></div> : null}
        </section>)}</div>
    </>;
}
