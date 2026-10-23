"use client";
import {useState} from "react";
import {CharacterPortrait} from "../components/CharacterName";
import {moveDeployment,suggestedDeployment,validDeployment} from "../../src/domain/warDeployment";

type Member={id:string;name:string;icon:string|undefined};
export default function DefenseDeployment({members,saved,onChange}:{members:Member[];saved:string[]|undefined;onChange:(ids:string[])=>void}){
 const suggestion=suggestedDeployment(members.map(member=>member.id));
 const ids=validDeployment(saved,suggestion.ids)?saved:suggestion.ids;
 const custom=ids.some((id,index)=>id!==suggestion.ids[index]);
 const [announcement,setAnnouncement]=useState("");
 return <section className="warDeployment" aria-label="Deployment order">
  <h3>Deployment order</h3>
  <p className="sub">Slots run left to right in the game. Check the numbered starting hexes on your map before confirming.</p>
  <ol>{ids.map((id,index)=>{const member=members.find(value=>value.id===id)!;return <li key={id}>
   <span className="warDeploymentNumber">{index+1}</span><CharacterPortrait name={member.name} id={id} icon={member.icon}/><strong>{member.name}</strong>
   <div><button type="button" aria-label={`Move ${member.name} earlier`} disabled={index===0} onClick={()=>{onChange(moveDeployment(ids,id,-1));setAnnouncement(`${member.name} moved to slot ${index}`);}}>Earlier</button><button type="button" aria-label={`Move ${member.name} later`} disabled={index===ids.length-1} onClick={()=>{onChange(moveDeployment(ids,id,1));setAnnouncement(`${member.name} moved to slot ${index+2}`);}}>Later</button></div>
  </li>})}</ol>
  <p className="sub">{custom?"Custom order saved in this browser.":suggestion.reason??"Starting order follows the selected core and flex list; it has not been optimized for AI behavior."}</p>
  {custom?<button type="button" onClick={()=>{onChange(suggestion.ids);setAnnouncement("Starting order restored");}}>Reset order</button>:null}
  <span role="status" className="sr-only">{announcement}</span>
 </section>;
}
