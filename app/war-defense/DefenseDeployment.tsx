"use client";
import {useState} from "react";
import Link from "next/link";
import {CharacterPortrait} from "../components/CharacterName";
import RankBadge from "../components/RankBadge";
import {warGearLabel,warGearStatus} from "../../src/domain/warGear";
import {moveDeployment,suggestedDeployment,validDeployment} from "../../src/domain/warDeployment";

type Member={id:string;name:string;icon:string|undefined;rank:number|null;activeLevel:number|null;passiveLevel:number|null;items:Array<{slotId:string;rarity?:string;level:number;name?:string}>};
export default function DefenseDeployment({members,saved,onChange,tier}:{members:Member[];saved:string[]|undefined;onChange:(ids:string[])=>void;tier:"gold"|"silver"}){
 const suggestion=suggestedDeployment(members.map(member=>member.id));
 const ids=validDeployment(saved,suggestion.ids)?saved:suggestion.ids;
 const custom=ids.some((id,index)=>id!==suggestion.ids[index]);
 const [editing,setEditing]=useState(false),[announcement,setAnnouncement]=useState("");
 const targetRank=tier==="gold"?12:9,targetAbility=tier==="gold"?35:26;
 return <section className="warDeployment" aria-label="Deployment order">
  <div className="warOrderActions"><button type="button" aria-pressed={editing} onClick={()=>setEditing(value=>!value)}>{editing?"Done":"Edit order"}</button>{custom?<button type="button" onClick={()=>{onChange(suggestion.ids);setAnnouncement("Starting order restored");}}>Reset order</button>:null}</div>
  <ol>{ids.map((id,index)=>{const member=members.find(value=>value.id===id)!,gear=warGearLabel(member.items,tier),activeGap=Math.max(0,targetAbility-(member.activeLevel??0)),passiveGap=Math.max(0,targetAbility-(member.passiveLevel??0));return <li key={id}>
   <span className="warDeploymentNumber" aria-label={`Slot ${index+1}`}>{index+1}</span>
   <Link href={`/characters/${id}`} className="warDefenseCharacter"><CharacterPortrait name={member.name} id={id} icon={member.icon}/><strong>{member.name}</strong></Link>
   <div className="warCharacterStatus"><RankBadge rank={member.rank??0}/>{(member.rank??0)<targetRank?<span> → <RankBadge rank={targetRank}/></span>:null}
    {activeGap||passiveGap?<small>{[activeGap?`Active +${activeGap}`:"",passiveGap?`Passive +${passiveGap}`:""].filter(Boolean).join(" / ")}</small>:null}
    {!gear.ready?<small title={gear.detail}>Gear: {warGearStatus(member.items,tier).missing.length} slots</small>:null}
   </div>
   {editing?<div className="warOrderButtons"><button type="button" aria-label={`Move ${member.name} earlier`} disabled={index===0} onClick={()=>{onChange(moveDeployment(ids,id,-1));setAnnouncement(`${member.name} moved to slot ${index}`);}}>←</button><button type="button" aria-label={`Move ${member.name} later`} disabled={index===ids.length-1} onClick={()=>{onChange(moveDeployment(ids,id,1));setAnnouncement(`${member.name} moved to slot ${index+2}`);}}>→</button></div>:null}
  </li>})}</ol>
  {editing&&!custom&&suggestion.reason?<small className="sub">{suggestion.reason}</small>:null}
  <span role="status" className="sr-only">{announcement}</span>
 </section>;
}
