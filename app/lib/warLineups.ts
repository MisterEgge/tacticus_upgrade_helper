import {getAccountWarDefense,warDefenseEvidence} from "./warDefensePlan";
import {RAID_MACHINES} from "../../src/domain/raidMachine";
import {buildDistinctOffenseTeams,uniqueWarTeamIndexes,type OffenseCore} from "../../src/domain/warTeams";
import {buildWarRosterLineups} from "../../src/domain/warRosterLineups";
import {readFile} from "node:fs/promises";
import type {Report} from "./report";
import type {CatalogCharacter} from "./catalog";

export type FullLineup={name:string;members:string[];core?:string[];flex?:Array<{name?:string;id?:string;used:number;win?:number;wins?:number}>;used:number;wins:number;defense?:number;win?:number;score:number;evidence?:"core-flex";reasons?:string[]};type Plan={teams?:OffenseCore[];validatedFullLineups?:FullLineup[]};

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
 const selectedOffense=uniqueWarTeamIndexes(observedOffense.map(team=>({...team,members:team.members.map(name=>({name}))})),10)
  .map(index=>observedOffense[index]!);
 const offenseObservations=[
  ...(offensePlan.teams??[]).flatMap(group=>[
   {names:group.core,used:group.used},
   ...group.flex.map(flex=>({names:[...group.core,flex.name],used:flex.used})),
  ]),
  ...(offensePlan.validatedFullLineups??[]).map(group=>({names:group.members,used:group.used})),
 ].map(group=>({ids:group.names.flatMap(name=>byName.get(name)?.id??[]),used:group.used}));
 const offenseFallback=buildWarRosterLineups(roster,new Set(selectedOffense.flatMap(team=>team.members.map(name=>byName.get(name)!.id))),
  Array.from({length:10-selectedOffense.length},()=>"silver" as const),offenseObservations).map(buildFallback);
 const fallbackOffenseNames=new Set(offenseFallback.flatMap(team=>team.members));
 const offense=[...observedOffense.filter(team=>team.members.every(name=>!fallbackOffenseNames.has(name)))
  .map(team=>({...team,flex:team.flex.filter(choice=>!fallbackOffenseNames.has(choice.name))})),...offenseFallback];
 return {defense,offense,offensePlan};
}
