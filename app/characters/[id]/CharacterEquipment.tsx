import ResourceName,{ResourceText} from "../../components/ResourceName";
import CollapsibleSection from "../../components/CollapsibleSection";
import ReferenceDetails from "../../components/ReferenceDetails";
import EquipmentSources from "../../components/EquipmentSources";
import {orderedEquipmentChoices,equipmentAction,type CharacterEquipmentSlot} from "../../lib/characterUpgradeSummary";
import type {RosterUnit} from "../../lib/report";
import type {ShopCatalog} from "../../../src/domain/shops";

function Upgrade({choice,shops,powerLevel}:{choice:CharacterEquipmentSlot;shops:ShopCatalog|null;powerLevel:number|null}) {
 const action=equipmentAction(choice);
 return <div className="equipmentSlotAction"><strong className={action.ready?"sourceLink":undefined}><ResourceName id={choice.state==="LEVEL UP"?choice.currentItemId??"":choice.allocatedItemId??choice.acquisition[0]?.id??""} name={action.label}/></strong><small><ResourceText text={action.detail}/></small>
  {choice.state!=="LEVEL UP"&&choice.acquisition.length?<EquipmentSources target={{preferredLegendaryItemIds:choice.acquisition.map(source=>source.id)}} catalog={shops} powerLevel={powerLevel}/>:null}
  <ReferenceDetails label="Replacement checks"><p>{choice.itemRarity} · {choice.reason}{choice.minimumLevel>1?` · needs level ${choice.minimumLevel} before equipping`:""}.</p>{choice.state==="EQUIP NOW"?<p>One inventory copy is reserved for {choice.character}; other alternatives are choices.</p>:null}</ReferenceDetails>
 </div>;
}
export default function CharacterEquipment({unit,slots,shops,powerLevel}:{unit:RosterUnit;slots:CharacterEquipmentSlot[];shops:ShopCatalog|null;powerLevel:number|null}) {
 const ready=slots.filter(slot=>slot.state==="EQUIP NOW").length,count=new Set(slots.map(slot=>slot.slotId)).size;
 return <div id="equipment"><CollapsibleSection title="Equipment" summary={`${ready?`${ready} inventory replacement${ready===1?"":"s"} ready · `:""}${count} slot${count===1?"":"s"} with upgrade work`} className="panel detailPanel characterEquipment compactCharacterTable">
  {unit.items.length?<div className="tableWrap"><table aria-label="Character equipment upgrades"><thead><tr><th>Equipped</th><th>Next upgrade</th></tr></thead><tbody>{unit.items.map(item=>{
   const choices=orderedEquipmentChoices(slots.filter(slot=>slot.slotId===item.slotId)),primary=choices[0];
   return <tr key={item.slotId}><td><strong><ResourceName id={item.id} name={item.name??item.id}/></strong><small>{item.rarity??"Unknown"} · level {item.level}</small></td><td>{primary?<><Upgrade choice={primary} shops={shops} powerLevel={powerLevel}/>{choices.length>1?<ReferenceDetails label={`Other upgrade options (${choices.length-1})`}>{choices.slice(1).map(choice=><Upgrade key={`${choice.itemRarity}:${choice.acquisition[0]?.id??choice.target}`} choice={choice} shops={shops} powerLevel={powerLevel}/>)}</ReferenceDetails>:null}</>:<small>No verified replacement target. Current gear or compatibility may need review.</small>}</td></tr>;
  })}</tbody></table></div>:<p className="sub">No equipped gear recorded at the last sync.</p>}
 </CollapsibleSection></div>;
}
