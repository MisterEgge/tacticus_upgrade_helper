"use client";
import {CharacterPortrait} from "../components/CharacterName";
import {defenseMachineFits,type DefenseMachine,type DefenseMachineTeam,type MachineFit} from "../../src/domain/warMachineRecommendations";

export default function DefenseMachineSuggestion({team,machines,selected,suggestion,onChoose}:{team:DefenseMachineTeam;machines:DefenseMachine[];selected:string|undefined;suggestion:MachineFit|undefined;onChoose:(id:string)=>void}){
 const fit=selected?defenseMachineFits(team,machines).find(value=>value.id===selected):suggestion;
 const machine=machines.find(value=>value.id===(selected||fit?.id));
 return <section className="warMachineFit" aria-label="Machine recommendation">
  {machine?<>
   <div className="characterCell"><CharacterPortrait id={machine.id} name={machine.name}/><strong>{selected?machine.name:`Suggested: ${machine.name}`}</strong><span>Primary {machine.active} / Secondary {machine.passive}</span></div>
   {fit?<details><summary>Why this machine</summary><p>{fit.reason}</p><p className="sub">{fit.caution} <a href={fit.source}>Ability reference</a></p></details>:<details><summary>Review pairing</summary><p className="sub">No reviewed synergy for this lineup. This manual assignment is preserved.</p></details>}
   {!selected&&fit?<button className="warMachineApply" type="button" onClick={()=>onChoose(fit.id)}>Use {machine.name}</button>:null}
  </>:<p className="sub">No unassigned owned machine has a reviewed fit. Change an assignment to free another option.</p>}
 </section>;
}
