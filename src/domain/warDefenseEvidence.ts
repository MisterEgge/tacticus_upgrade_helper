export type DefenseObservation={id:string;used:number;wins:number};
export type DefenseCoreEvidence={key:string;core:string[];used:number;wins:number;flex:DefenseObservation[]};
export type DefenseEvidence={schemaVersion:1;sourceUrl:string;importedAt:string;sourceSha256:string;metric:string;scope:{battlefields:string[];seasons:string[];maps:string[];outcome:string;battle:string};cores:DefenseCoreEvidence[]};

/** Wilson's 95% lower bound favors repeated holds over tiny perfect samples. */
export function defenseConfidence(wins:number,used:number):number{
 if(!Number.isSafeInteger(used)||used<=0||!Number.isSafeInteger(wins)||wins<0||wins>used)return 0;
 const z=1.96,p=wins/used,z2=z*z;
 return (p+z2/(2*used)-z*Math.sqrt(p*(1-p)/used+z2/(4*used*used)))/(1+z2/used);
}
export type DefenseRosterMember={id:string;name:string;rank:number};
export type EvidenceDefenseTeam={name:string;core:string[];members:string[];tier:"gold"|"silver";slot:number;used:number;wins:number;confidence:number;flex:DefenseObservation[];evidence:"core-flex"};

/** Rank cores by actual defense rate; retain sample-aware ranking for flex. */
export function selectEvidenceDefense(cores:DefenseCoreEvidence[],roster:DefenseRosterMember[]):EvidenceDefenseTeam[]{
 const byId=new Map(roster.map(unit=>[unit.id,unit]));
 const ranked=[...cores].filter(core=>core.core.length===3&&new Set(core.core).size===3&&core.used>0&&core.wins>=0&&core.wins<=core.used).sort((a,b)=>b.wins/b.used-a.wins/a.used||b.used-a.used||a.key.localeCompare(b.key));
 const used=new Set<string>(),teams:EvidenceDefenseTeam[]=[];
 for(const [slot,tier] of (["gold","gold","silver","silver","silver"] as const).entries()){
  const minimum=tier==="gold"?12:9;
  const eligible=(id:string)=>!used.has(id)&&(byId.get(id)?.rank??-1)>=minimum;
  for(const core of ranked){
   if(!core.core.every(eligible))continue;
   const seen=new Set(core.core);
   const flex=[...core.flex].filter(unit=>{
    if(seen.has(unit.id)||!eligible(unit.id)||unit.used<=0||unit.wins<0||unit.wins>unit.used)return false;
    seen.add(unit.id);return true;
   }).sort((a,b)=>defenseConfidence(b.wins,b.used)-defenseConfidence(a.wins,a.used)||b.used-a.used||a.id.localeCompare(b.id));
   if(flex.length<2)continue;
   const picks=flex.slice(0,2),members=[...core.core,...picks.map(unit=>unit.id)];
   members.forEach(id=>used.add(id));
   teams.push({name:members.map(id=>byId.get(id)!.name).join(" / "),core:core.core,members,tier,slot,used:core.used,wins:core.wins,confidence:defenseConfidence(core.wins,core.used),flex:picks,evidence:"core-flex"});
   break;
  }
 }
 return teams;
}
