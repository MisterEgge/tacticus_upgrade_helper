export type DefenseObservation={id:string;used:number;wins:number};
export type DefenseCoreEvidence={key:string;core:string[];used:number;wins:number;flex:DefenseObservation[]};
export type DefenseEvidence={schemaVersion:1;sourceUrl:string;importedAt:string;sourceSha256:string;metric:string;scope:{battlefields:string[];seasons:string[];maps:string[];outcome:string;battle:string};cores:DefenseCoreEvidence[]};
const MINIMUM_FLEX_USES=100;

/** Wilson's 95% lower bound favors repeated holds over tiny perfect samples. */
export function defenseConfidence(wins:number,used:number):number{
 if(!Number.isSafeInteger(used)||used<=0||!Number.isSafeInteger(wins)||wins<0||wins>used)return 0;
 const z=1.96,p=wins/used,z2=z*z;
 return (p+z2/(2*used)-z*Math.sqrt(p*(1-p)/used+z2/(4*used*used)))/(1+z2/used);
}
export type DefenseRosterMember={id:string;name:string;rank:number};
export type EvidenceDefenseTeam={name:string;core:string[];members:string[];tier:"gold"|"silver";slot:number;used:number;wins:number;confidence:number;flex:DefenseObservation[];evidence:"core-flex"};
export type GoldDefenseBuildTeam={core:string[];members:string[];used:number;wins:number;flex:DefenseObservation[];rankGap:number};
export type GoldDefenseBuildCharacter={id:string;rank:number;used:number;wins:number;evidence:"core"|"flex"};
export type GoldDefenseBuildTargets={teams:GoldDefenseBuildTeam[];characters:GoldDefenseBuildCharacter[]};

/** Keep cores as observed; globally allocate flex by hold rate after a minimum sample. */
export function selectEvidenceDefense(cores:DefenseCoreEvidence[],roster:DefenseRosterMember[]):EvidenceDefenseTeam[]{
 const byId=new Map(roster.map(unit=>[unit.id,unit]));
 const ranked=[...cores].filter(core=>core.core.length===3&&new Set(core.core).size===3&&core.used>0&&core.wins>=0&&core.wins<=core.used).sort((a,b)=>b.wins/b.used-a.wins/a.used||b.used-a.used||a.key.localeCompare(b.key));
 const usedCores=new Set<string>(),teams:Array<{core:DefenseCoreEvidence;tier:"gold"|"silver";slot:number}>=[];
 for(const [slot,tier] of (["gold","gold","silver","silver","silver"] as const).entries()){
  const minimum=tier==="gold"?12:9;
  for(const core of ranked){
   if(!core.core.every(id=>(byId.get(id)?.rank??-1)>=minimum&&!usedCores.has(id)))continue;
   const seen=new Set(core.core);
   const flex=core.flex.filter(unit=>{
    if(seen.has(unit.id)||(byId.get(unit.id)?.rank??-1)<minimum||unit.used<MINIMUM_FLEX_USES||unit.wins<0||unit.wins>unit.used)return false;
    seen.add(unit.id);return true;
   });
   if(flex.length<2)continue;
   core.core.forEach(id=>usedCores.add(id));
   teams.push({core,tier,slot});
   break;
  }
 }
 const reservedCores=new Set(teams.flatMap(team=>team.core.core));
 const options=teams.map(team=>{
  const minimum=team.tier==="gold"?12:9,seen=new Set<string>();
  const flex=team.core.flex.filter(unit=>{
   if(reservedCores.has(unit.id)||seen.has(unit.id)||(byId.get(unit.id)?.rank??-1)<minimum||unit.used<MINIMUM_FLEX_USES||unit.wins<0||unit.wins>unit.used)return false;
   seen.add(unit.id);return true;
  });
  const pairs:Array<{members:DefenseObservation[];score:number}>=[];
  for(let first=0;first<flex.length;first++)for(let second=first+1;second<flex.length;second++){
   const members=[flex[first]!,flex[second]!];
   pairs.push({members,score:members.reduce((total,member)=>total+member.wins/member.used*1000+Math.log1p(member.used)*0.001,0)});
  }
  return pairs.sort((a,b)=>b.score-a.score);
 });
 const order=teams.map((_,index)=>index).sort((a,b)=>options[a]!.length-options[b]!.length||a-b);
 let bestCount=0,bestScore=-Infinity,best:Array<DefenseObservation[]|undefined>=Array(teams.length);
 const visit=(position:number,used:Set<string>,score:number,selected:Array<DefenseObservation[]|undefined>)=>{
  if(position===order.length){
   const count=selected.filter(Boolean).length;
   if(count>bestCount||count===bestCount&&score>bestScore){bestCount=count;bestScore=score;best=[...selected];}
   return;
  }
  const index=order[position]!;
  for(const pair of options[index]!){
   if(pair.members.some(member=>used.has(member.id)))continue;
   const next=new Set([...used,...pair.members.map(member=>member.id)]);
   selected[index]=pair.members;visit(position+1,next,score+pair.score,selected);selected[index]=undefined;
  }
  selected[index]=undefined;
  visit(position+1,used,score,selected);
 };
 if(teams.length)visit(0,new Set(reservedCores),0,Array(teams.length));
 const owners=new Map<string,{team:number;observation:DefenseObservation}>();
 for(let index=0;index<teams.length;index++)for(const observation of teams[index]!.core.flex){
  if(reservedCores.has(observation.id)||observation.used<MINIMUM_FLEX_USES||observation.wins<0||observation.wins>observation.used)continue;
  const selectedTeam=best.findIndex(pair=>pair?.some(member=>member.id===observation.id));
  const current=owners.get(observation.id);
  if(selectedTeam>=0){if(selectedTeam!==index)continue;owners.set(observation.id,{team:index,observation});continue;}
  if(current&&best.findIndex(pair=>pair?.some(member=>member.id===observation.id))>=0)continue;
  if(!current||observation.wins/observation.used>current.observation.wins/current.observation.used||
   observation.wins/observation.used===current.observation.wins/current.observation.used&&observation.used>current.observation.used)owners.set(observation.id,{team:index,observation});
 }
 return teams.flatMap((team,index)=>{
  const picks=best[index]??[];
  if(picks.length!==2)return [];
  const members=[...team.core.core,...picks.map(unit=>unit.id)];
  const flex=[...owners.entries()].filter(([,owner])=>owner.team===index).map(([,owner])=>owner.observation).sort((a,b)=>b.wins/b.used-a.wins/a.used||b.used-a.used||a.id.localeCompare(b.id));
  return [{name:members.map(id=>byId.get(id)!.name).join(" / "),core:team.core.core,members,tier:team.tier,slot:team.slot,used:team.core.used,wins:team.core.wins,confidence:defenseConfidence(team.core.wins,team.core.used),flex,evidence:"core-flex" as const}];
 });
}

/** Find owned source-backed Gold lineups to work toward without reusing assigned units. */
export function suggestGoldDefenseBuilds(cores:DefenseCoreEvidence[],roster:DefenseRosterMember[],unavailableIds:ReadonlySet<string>,slots:number):GoldDefenseBuildTargets{
 const byId=new Map(roster.map(unit=>[unit.id,unit]));
 const ranked=[...cores].filter(core=>core.core.length===3&&new Set(core.core).size===3&&core.used>0&&core.wins>=0&&core.wins<=core.used)
  .sort((a,b)=>b.wins/b.used-a.wins/a.used||b.used-a.used||a.key.localeCompare(b.key));
 const options: Array<{team:GoldDefenseBuildTeam;score:number}>=[];
 for(const core of ranked){
  if(core.core.some(id=>unavailableIds.has(id)||!byId.has(id)))continue;
  const seen=new Set(core.core);
  const flex=core.flex.filter(unit=>{
   if(unavailableIds.has(unit.id)||!byId.has(unit.id)||seen.has(unit.id)||unit.used<MINIMUM_FLEX_USES||unit.wins<0||unit.wins>unit.used)return false;
   seen.add(unit.id);return true;
  });
  for(let first=0;first<flex.length;first++)for(let second=first+1;second<flex.length;second++){
   const picks=[flex[first]!,flex[second]!],members=[...core.core,...picks.map(unit=>unit.id)];
   const rankGap=members.reduce((total,id)=>total+Math.max(0,12-(byId.get(id)?.rank??0)),0);
   const score=core.wins/core.used*1000+picks.reduce((total,unit)=>total+unit.wins/unit.used,0)+Math.log1p(core.used)*0.001;
   options.push({team:{core:[...core.core],members,used:core.used,wins:core.wins,flex:picks,rankGap},score});
  }
 }
 options.sort((a,b)=>b.score-a.score||a.team.rankGap-b.team.rankGap||b.team.used-a.team.used||a.team.members.join("|").localeCompare(b.team.members.join("|")));
 let best:typeof options=[];
 const visit=(start:number,selected:typeof options,used:Set<string>)=>{
  if(selected.length>best.length||selected.length===best.length&&(selected.reduce((sum,value)=>sum+value.score,0)>best.reduce((sum,value)=>sum+value.score,0)||
   selected.reduce((sum,value)=>sum+value.score,0)===best.reduce((sum,value)=>sum+value.score,0)&&selected.reduce((sum,value)=>sum+value.team.rankGap,0)<best.reduce((sum,value)=>sum+value.team.rankGap,0)))best=[...selected];
  if(selected.length>=slots)return;
  for(let index=start;index<options.length;index++){
   const option=options[index]!;
   if(option.team.members.some(id=>used.has(id)))continue;
   visit(index+1,[...selected,option],new Set([...used,...option.team.members]));
  }
 };
 if(slots>0)visit(0,[],new Set(unavailableIds));
 const teams=best.map(option=>option.team);
 const recommendedIds=new Set(teams.flatMap(team=>team.members));
 const characterEvidence=new Map<string,GoldDefenseBuildCharacter>();
 const addCharacter=(id:string,used:number,wins:number,evidence:"core"|"flex")=>{
  const member=byId.get(id);
  if(!member||unavailableIds.has(id)||recommendedIds.has(id)||!Number.isFinite(used)||used<=0||!Number.isFinite(wins)||wins<0||wins>used)return;
  const current=characterEvidence.get(id),candidate={id,rank:member.rank,used,wins,evidence};
  if(!current||wins/used>current.wins/current.used||wins/used===current.wins/current.used&&used>current.used)characterEvidence.set(id,candidate);
 };
 for(const core of ranked){
  for(const id of core.core)addCharacter(id,core.used,core.wins,"core");
  for(const observation of core.flex)if(observation.used>=MINIMUM_FLEX_USES)addCharacter(observation.id,observation.used,observation.wins,"flex");
 }
 const characters=[...characterEvidence.values()].sort((a,b)=>b.wins/b.used-a.wins/a.used||b.used-a.used||a.id.localeCompare(b.id));
 return {teams,characters};
}
