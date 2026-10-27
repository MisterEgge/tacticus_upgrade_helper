import {getAccountWarDefense} from "../lib/warDefensePlan";
import {getGearTransferContext} from "../lib/gearTransferContext";
import {getAccountEquipmentPlan} from "../lib/accountEquipmentPlan";
import Link from "next/link";
import {getShopCatalog}from "../lib/shops";
import {getCharacterCatalog}from "../lib/catalog";
import {readFile}from "node:fs/promises";
import {campaignIsComplete,requiredCampaignName,type CampaignBattleDefinition}from "../../src/domain/campaigns";
import {equipmentFocusPriority,type EquipmentFocus}from "../../src/domain/equipmentFocus";
import Nav from "../components/Nav";
import {getReport}from "../lib/report";
import EquipmentTable from "./EquipmentTable";

export default async function Equipment()
{
 const[report,shops,catalog,focus,battleText,offensePlan]=await Promise.all([getReport(),getShopCatalog(),getCharacterCatalog(),readFile("config/character_priorities.json","utf8").then(value=>JSON.parse(value)as Record<string,EquipmentFocus>),readFile("data/game/campaign-battles.json","utf8"),readFile("config/war_offense_teams.json","utf8").then(JSON.parse) as Promise<{validatedFullLineups:Array<{name:string;members:string[];used:number;wins:number}>}>]);
 if(!report)return <main><Nav/><div className="empty">Run <code>npm run refresh</code>.</div></main>;
 const equipmentPlan=await getAccountEquipmentPlan(report,catalog,shops);
 const {rows,catalogEquipment,unitByName,catalogByName,raidNames}=equipmentPlan;
 const raid=new Set(raidNames);
 const battles=Object.values(JSON.parse(battleText))as CampaignBattleDefinition[];
 const incomplete=new Set((report.campaignProgress??[]).filter(progress=>!campaignIsComplete(progress,battles)).map(requiredCampaignName));
 const campaignRequired=new Set(catalog.characters.filter(character=>character.campaignsRequiredIn.some(name=>incomplete.has(name))).map(character=>character.name));
 const defensiveAudit=report.roster.flatMap(unit=>
 {
   const character=catalogByName.get(unit.name);
   if(!character?.equipment.includes("I_Defensive")||character.traits.includes("MkXGravis"))return [];
   const item=unit.items.find(item=>item.slotId==="Slot2");
   const stats=item?catalogEquipment[item.id]?.baseStats:undefined;
   return [{name:unit.name,status:!item?"MISSING":!stats?"UNKNOWN":stats.hp&&stats.armor?"CORRECT":"MISMATCH",itemId:item?.id}];
 });
 const defensiveIssues=defensiveAudit.filter(row=>row.status!=="CORRECT");
 const defensiveCorrect=defensiveAudit.length-defensiveIssues.length;
 rows.sort((a,b)=>equipmentFocusPriority(b.character,focus,campaignRequired,raid)-equipmentFocusPriority(a.character,focus,campaignRequired,raid)||a.character.localeCompare(b.character));
 const owned=new Set(report.roster.map(unit=>unit.name));
 const defenseTeams=getAccountWarDefense(report).map(team=>({name:team.name,used:team.used,tier:team.tier,members:team.members.map(name=>({name}))}));
 const offenseTeams=offensePlan.validatedFullLineups.filter(team=>team.members.every(name=>owned.has(name))).sort((a,b)=>b.wins/b.used-a.wins/a.used||b.used-a.used).map(team=>({name:team.name,used:team.used,members:team.members.map(name=>({name}))}));
 const transferContext=await getGearTransferContext({report,catalog,shops,plan:equipmentPlan});
 const goalRows=rows.map(row=>({...row,rarity:unitByName.get(row.character)?.rarity??"Unknown"}));
 return <main><Nav/><header><div><p className="eyebrow">EQUIPMENT</p><h1>Equipment upgrades</h1><p className="sub">Equip from inventory, move unused gear, or find shop upgrades.</p></div></header><section className="panel detailPanel equipmentPanel"><EquipmentTable transferContext={transferContext!} rows={goalRows} inventory={report.unequippedInventory} raidNames={raidNames} campaignNames={[...campaignRequired]} defenseTeams={defenseTeams} offenseTeams={offenseTeams}/></section><details className="equipmentAudit"><summary>Equipment checks · {defensiveIssues.length} health + armor checks needed · {report.equipmentAllocation.compatibilityUnknown.length} compatibility reviews</summary><p>{defensiveCorrect}/{defensiveAudit.length} eligible characters have health + armor equipment.</p>{defensiveIssues.length?<p>{defensiveIssues.map(row=>row.name).join(" · ")}</p>:null}{report.equipmentAllocation.compatibilityUnknown.length?<p>Compatibility needs review: {[...new Set(report.equipmentAllocation.compatibilityUnknown.map(row=>row.character))].join(" · ")}</p>:null}<Link className="sourceLink" href="/sources">Shop catalogs and stock tracking</Link></details></main>;
}
