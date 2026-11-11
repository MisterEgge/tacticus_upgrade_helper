import Link from "next/link";
import CharacterName from "../components/CharacterName";

type RaidUpgradeMember={name:string;id:string;icon?:string|undefined;owned:boolean;rank:number|null;activeLevel:number|null;passiveLevel:number|null;activeTarget:string;passiveTarget:string};
type RaidUpgradeTeam={core:string[];flex:string[];members:RaidUpgradeMember[]};
type RaidUpgradeTeams=Record<string,Record<string,RaidUpgradeTeam>>;
type Usage={boss:string;team:string};
type Entry={member:RaidUpgradeMember;uses:Usage[]};

function collect(teams:RaidUpgradeTeams,role:"core"|"flex"):Entry[]{
 const entries=new Map<string,Entry>();
 for(const [boss,options] of Object.entries(teams))for(const [teamName,team] of Object.entries(options)){
  const names=role==="core"?team.core:team.flex.filter(name=>!team.core.includes(name));
  for(const name of names){
   const member=team.members.find(value=>value.name===name);
   if(!member)continue;
   const entry=entries.get(member.id)??{member,uses:[]};
   entry.uses.push({boss,team:teamName});
   entries.set(member.id,entry);
  }
 }
 return [...entries.values()].sort((a,b)=>Number(b.member.owned)-Number(a.member.owned)||a.member.name.localeCompare(b.member.name));
}

function CharacterGroup({title,entries,role}:{title:string;entries:Entry[];role:"core"|"flex"}){
 return <section className={`raidUpgradeRosterGroup ${role}`}><h3>{title} <small>{entries.length}</small></h3>
  {entries.length?<div className="raidUpgradeRosterGrid">{entries.map(({member,uses})=><article className="raidUpgradeRosterCard" key={member.id}>
   <Link href={`/characters/${encodeURIComponent(member.id)}`} className="raidUpgradeRosterCharacter"><CharacterName name={member.name} id={member.id} icon={member.icon}/><span className={member.owned?"raidUpgradeOwned":"raidUpgradeUnowned"}>{member.owned?"Owned":"Not owned"}</span></Link>
   <div className="raidUpgradeRosterLevels"><span>Rank {member.rank??"—"}</span><span>Active {member.activeLevel??"—"} → {member.activeTarget}</span><span>Passive {member.passiveLevel??"—"} → {member.passiveTarget}</span></div>
   <div className="raidUpgradeRosterUses">{uses.map(use=><span key={`${use.boss}-${use.team}`}>{use.boss} · {use.team}</span>)}</div>
  </article>)}</div>:<p className="sub">No {role} characters in the current boss recommendations.</p>}
 </section>;
}

export default function RaidUpgradeCoverage({teams}:{teams:RaidUpgradeTeams}){
 const core=collect(teams,"core"),flex=collect(teams,"flex");
 return <section className="panel detailPanel raidUpgradeCoverage" aria-label="Guild Raid upgrade coverage">
  <div className="sectionTitle"><div><h2>Roster upgrade coverage</h2><p className="sub">Boss recommendations across all teams, grouped by source role. Use these lists to compare core investments with flex options.</p></div></div>
  <CharacterGroup title="Core characters" entries={core} role="core"/>
  <CharacterGroup title="Flex characters" entries={flex} role="flex"/>
 </section>;
}
