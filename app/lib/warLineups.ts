import {getAccountWarDefense,warDefenseEvidence} from "./warDefensePlan";
import {RAID_MACHINES} from "../../src/domain/raidMachine";
import {buildDistinctOffenseTeams,uniqueWarTeamIndexes,type OffenseCore} from "../../src/domain/warTeams";
import {buildWarRosterLineups} from "../../src/domain/warRosterLineups";
import {warTierMinimumRank} from "../../src/domain/warReadiness";
import {readFile} from "node:fs/promises";
import type {Report} from "./report";
import type {CatalogCharacter} from "./catalog";

export type FullLineup={name:string;members:string[];core?:string[];flex?:Array<{name?:string;id?:string;used:number;win?:number;wins?:number}>;used:number;wins:number;defense?:number;win?:number;score:number;evidence?:"core-flex";reasons?:string[];priority?:number};type Plan={teams?:OffenseCore[];validatedFullLineups?:FullLineup[]};

export async function getWarLineups(report:Report,catalog:{characters:CatalogCharacter[]}){
 const offensePlan=JSON.parse(await readFile("config/war_offense_teams.json","utf8")) as Plan;
 const byName=new Map(report.roster.map(unit=>[unit.name,unit]));
 const byId=new Map(report.roster.map(unit=>[unit.id,unit]));
 const metadata=new Map(catalog.characters.map(character=>[character.id,character]));
 const machineIds=new Set<string>(RAID_MACHINES.map(machine=>machine.id));
 const roster=report.roster.filter(unit=>!machineIds.has(unit.id)).map(unit=>({...unit,traits:metadata.get(unit.id)?.traits??[]}));
 const buildFallback=(lineup:ReturnType<typeof buildWarRosterLineups>[number])=>({
  ...lineup,name:lineup.members.join(" / "),core:lineup.members,used:0,wins:0,score:0,flex:[],
 });
 const observedDefense=getAccountWarDefense(report).map(lineup=>({...lineup,score:lineup.confidence}));
 const emptyDefenseSlots=(["gold","gold","silver","silver","silver"] as const)
  .flatMap((tier,slot)=>observedDefense.some(team=>team.slot===slot)?[]:[{tier,slot}]);
 const defenseFallback=buildWarRosterLineups(roster,new Set(observedDefense.flatMap(team=>team.memberIds)),
  emptyDefenseSlots.map(slot=>slot.tier),warDefenseEvidence.cores.flatMap(group=>[
   {ids:group.core,used:group.used},
   ...group.flex.map(flex=>({ids:[...group.core,flex.id],used:flex.used})),
  ])).map((lineup,index)=>({...buildFallback(lineup),...emptyDefenseSlots[index]!}));
 const fallbackDefenseNames=new Set(defenseFallback.flatMap(team=>team.members));
 const defense=[...observedDefense.map(team=>({...team,flex:team.flex.filter(choice=>!fallbackDefenseNames.has(byId.get(choice.id)?.name??""))})),...defenseFallback];

 const offenseCores=buildDistinctOffenseTeams(offensePlan.teams??[],new Set(byName.keys()));
 const exactOffense=(offensePlan.validatedFullLineups??[]).filter(team=>team.members.every(name=>byName.has(name)))
  .map(lineup=>({...lineup,core:lineup.members,flex:[]}));
 const observedOffense=[...offenseCores,...exactOffense].sort((a,b)=>b.wins/b.used-a.wins/a.used||b.used-a.used);
 const offenseObservations=[
  ...(offensePlan.teams??[]).flatMap(group=>[
   {names:group.core,used:group.used},
   ...group.flex.map(flex=>({names:[...group.core,flex.name],used:flex.used})),
  ]),
  ...(offensePlan.validatedFullLineups??[]).map(group=>({names:group.members,used:group.used})),
 ].map(group=>({ids:group.names.flatMap(name=>byName.get(name)?.id??[]),used:group.used}));
 const select=<T extends FullLineup>(teams:T[],limit:number)=>
  uniqueWarTeamIndexes(teams.map(team=>({...team,members:team.members.map(name=>({name}))})),limit).map(index=>teams[index]!);
 const isGold=(team:FullLineup)=>team.members.length===5&&team.members.every(name=>(byName.get(name)?.rank??-1)>=warTierMinimumRank("gold"));
 const assignedIds=(teams:FullLineup[])=>new Set(teams.flatMap(team=>team.members.map(name=>byName.get(name)!.id)));
 const goldRoster=roster.filter(unit=>unit.rank>=warTierMinimumRank("gold"));
 const goldTargets=["gold","gold"] as const;
 const observedGold=select(observedOffense.filter(isGold),goldTargets.length);
 const goldFallback=buildWarRosterLineups(goldRoster,assignedIds(observedGold),goldTargets.slice(observedGold.length),offenseObservations).map(buildFallback);
 const goldTeams=[...observedGold,...goldFallback];
 const goldNames=new Set(goldTeams.flatMap(team=>team.members));
 const remainingObserved=observedOffense.filter(team=>team.members.every(name=>!goldNames.has(name)));
 const selectedOffense=select(remainingObserved,10-goldTeams.length);
 const offenseFallback=buildWarRosterLineups(roster,assignedIds([...goldTeams,...selectedOffense]),
  Array.from({length:10-goldTeams.length-selectedOffense.length},()=>"silver" as const),offenseObservations).map(buildFallback);
 const fallbackOffenseNames=new Set(offenseFallback.flatMap(team=>team.members));
 const protectedNames=new Set([...goldNames,...fallbackOffenseNames]);
 const offense=[...goldTeams.map(team=>({...team,priority:1,flex:team.flex.filter(choice=>!protectedNames.has(choice.name)||team.members.includes(choice.name))})),
  ...remainingObserved.filter(team=>team.members.every(name=>!fallbackOffenseNames.has(name)))
   .map(team=>({...team,flex:team.flex.filter(choice=>!protectedNames.has(choice.name))})),...offenseFallback];
 return {defense,offense,offensePlan};
}
