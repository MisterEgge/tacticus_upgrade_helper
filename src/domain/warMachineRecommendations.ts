import {RAID_MACHINES} from "./raidMachine";
import {restoreWarMachines} from "./warMachineSelection";

export type DefenseMachine={id:string;name:string;active:number;passive:number};
export type DefenseMachineTeam={name:string;tier?:"gold"|"silver";members:readonly {id:string;traits?:readonly string[];faction?:string}[]};
export type MachineFit={id:string;reason:string;caution:string;source:string;score:number};
const wiki=(page:string)=>`https://tacticus.wiki.gg/wiki/${page}`;

/** Ordinal planning judgments, never probabilities or measured defense rates. */
export function defenseMachineFits(team:DefenseMachineTeam,machines:readonly DefenseMachine[]):MachineFit[]{
 const count=(trait:string)=>team.members.filter(member=>member.traits?.includes(trait)).length;
 const faction=(name:string)=>team.members.filter(member=>member.faction===name).length;
 const mechanical=count("Mechanical"),psyker=count("Psyker"),orks=faction("Orks");
 const fireMobile=team.members.filter(member=>member.traits?.some(trait=>trait==="Flying"||trait==="Unstoppable")).length;
 const immune=team.members.length>0&&team.members.every(member=>member.traits?.some(trait=>trait==="Mechanical"||trait==="ContagionsOfNurgle"));
 const cap=team.tier==="gold"?35:26;
 const known=new Set<string>(RAID_MACHINES.map(machine=>machine.id));
 return machines.filter(machine=>known.has(machine.id)).flatMap(machine=>{
  let base=0,reason="",caution="",page="";
  switch(machine.id){
   case "necroReanimator":if(mechanical<2)break;base=75+mechanical*3;page="Reanimator";reason="Mechanical allies can receive repair protocols, then repair and revival support. Marked mechanical summons can act again.";caution="AI must apply protocols before the primary helps; overkill prevents revival.";break;
   case "orksRukkatrukk":if(orks<2)break;base=70+orks*3;page="Rukkatrukk";reason="Orks make the primary's adjacency requirement easier; two Orks around its target can also produce a Squig.";caution="Requires contact with the enemy. Low-level damage and Squigs may contribute little.";break;
   case "deathCrawler":if(!immune)break;base=78;page="Hex_Effect";reason="Every teammate is immune to contamination's armour penalty, making this a safer contamination lineup.";caution="AI placement and enemy immunity still matter; contamination replaces other hex effects.";break;
   case "thousDaemonPrince":if(psyker<2)break;base=68+psyker*3;page="Z%27kar";reason="Multiple Psykers offer deployment adjacency and psychic-hit follow-up opportunities.";caution="AI must place Z'Kar beside a Psyker and find a target in range; damage scales with abilities.";break;
   case "darkaStormSpeeder":if(count("Overwatch")<2&&faction("Dark Angels")<2)break;base=64;page="Storm_Speeder";reason="Hailstrike can improve ranged and Overwatch pierce; Dark Angels may also exploit the primary's follow-up bonus.";caution="The AI chooses the recipient and timing. This does not guarantee an Overwatch combo.";break;
   case "tauBroadside":if(!team.members.some(member=>member.id==="tauCrisis"))break;base=58;page="Tson%27ji";reason="Markerlight can support Re'vas's Tau ranged interactions without relying on high missile damage.";caution="The secondary marks after dealing damage; a fresh target does not receive an immediate missile hit.";break;
   case "blackForgefiend":base=54+fireMobile*2;page="Forgefiend";reason="Fire restricts enemy approaches; the primary offers summon clearing.";if(fireMobile)reason+=" Your Flying or Unstoppable units can cross fire without stopping.";caution="Fire can also obstruct your other ground units. Low primary levels do not guarantee summon kills.";break;
   case "tyranBiovore":base=52;page="Biovore";reason="Mines add threats and board pressure without requiring a specific faction.";caution="A human attacker can ignore or clear mines; this is not the same as baiting Arena AI.";break;
   case "astraOrdnanceBattery":base=35+count("Healer")*3;page="Malleus_Rocket_Launcher";reason="Extra Guardsmen can add bodies in a drawn-out defense.";caution="The secondary has a two-round initial cooldown; weak Guardsmen may die immediately.";break;
   case "ultraDreadnought":base=30+mechanical*4;page="HDTW_DutyEternal";reason="A stationary reinforcement adds another target; mechanical teammates may offer repair support.";caution="Deployment ends its machine role. Placement and primary-level durability are crucial.";break;
  }
  if(!base)return [];
  // Small, capped readiness preference. Levels cannot turn an incompatible
  // machine into a synergy pick; equal levels across machines are not equal power.
  const level=(value:number)=>Number.isFinite(value)?Math.max(0,Math.min(cap,value)):0;
  const readiness=machine.id==="ultraDreadnought"?level(machine.active)/cap*8:(level(machine.active)+level(machine.passive))/(2*cap)*8;
  return [{id:machine.id,reason,caution,source:wiki(page),score:base+readiness}];
 }).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
}

/** Maximize total reviewed fit across the defense, respecting manual assignments. */
export function recommendDefenseMachines(teams:readonly DefenseMachineTeam[],machines:readonly DefenseMachine[],selected:Record<string,string>={}):Record<string,MachineFit>{
 const owned=[...new Map(machines.filter(machine=>RAID_MACHINES.some(known=>known.id===machine.id)).map(machine=>[machine.id,machine])).values()];
 const pins=restoreWarMachines(selected,teams.map(team=>team.name),new Set(owned.map(machine=>machine.id)));
 const reserved=new Set(Object.values(pins));
 const pending=teams.filter(team=>!pins[team.name]).sort((a,b)=>a.name.localeCompare(b.name));
 const options=pending.map(team=>defenseMachineFits(team,owned).filter(fit=>!reserved.has(fit.id)));
 const memo=new Map<string,{score:number;picks:Record<string,MachineFit>}>();
 const solve=(index:number,mask:number):{score:number;picks:Record<string,MachineFit>}=>{
  if(index===pending.length)return {score:0,picks:{}};
  const key=`${index}:${mask}`,cached=memo.get(key);if(cached)return cached;
  let best=solve(index+1,mask);
  for(const fit of options[index]!){const bit=1<<owned.findIndex(machine=>machine.id===fit.id);if(mask&bit)continue;
   const rest=solve(index+1,mask|bit),score=fit.score+rest.score;
   if(score>best.score)best={score,picks:{...rest.picks,[pending[index]!.name]:fit}};
  }
  memo.set(key,best);return best;
 };
 return solve(0,0).picks;
}
