import Nav from"../components/Nav";
import{getAbilityBreakpoints,getCharacterCatalog}from"../lib/catalog";
import{getReport}from"../lib/report";
import{abilityGuideRows}from"../../src/domain/abilities";
import AbilityBadgeBudget from"./AbilityBadgeBudget";

export default async function Abilities()
{
 const[report,catalog,guidance]=await Promise.all([getReport(),getCharacterCatalog(),getAbilityBreakpoints()]);
 if(!report)return <main><Nav/><div className="empty">Run <code>npm run refresh</code>.</div></main>;
 const rows=abilityGuideRows(catalog.characters,report.roster,guidance,{}).filter(row=>row.owned).map(row=>({id:row.id,name:row.character,alliance:report.roster.find(unit=>unit.id===row.id)?.grandAlliance??"Unknown",activeLevel:row.activeLevel,passiveLevel:row.passiveLevel,activeTarget:row.activeTargetLevel,passiveTarget:row.passiveTargetLevel}));
 return <main><Nav/><header><div><p className="eyebrow">ABILITIES</p><h1>Badge Budget</h1><p className="sub">See the exact Alliance badge totals required to raise your owned characters’ planned abilities through a selected rarity cap.</p></div><div className="power">{rows.length}<strong> owned characters</strong></div></header><section className="panel detailPanel"><AbilityBadgeBudget rows={rows}/></section></main>;
}
