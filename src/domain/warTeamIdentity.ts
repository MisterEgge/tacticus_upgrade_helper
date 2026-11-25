/** Team identity follows its core, independent of slot, tier, flex or source order. */
export function warTeamIdentity(members:readonly {id:string;name:string}[],kind:"core"|"lineup"="core"){
 const sorted=[...members].sort((a,b)=>a.id.localeCompare(b.id));
 return {id:kind+":"+JSON.stringify(sorted.map(unit=>unit.id)),name:sorted.map(unit=>unit.name).join(" / ")};
}
