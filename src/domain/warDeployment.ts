/** Deployment is separate from evidence-ranked team membership. */
export function deploymentKey(ids: readonly string[]): string {
 return JSON.stringify([...ids].sort());
}

export function validDeployment(value: unknown, ids: readonly string[]): value is string[] {
 return Array.isArray(value) && value.length===ids.length && new Set(value).size===ids.length && value.every(id=>typeof id==="string" && ids.includes(id));
}

export function suggestedDeployment(ids: readonly string[]): {ids:string[];reason:string|null} {
 // Community guidance places Rotbone after advancing teammates, so healing
 // can reach them. This is a starting heuristic, not a measured win-rate result.
 if(ids.includes("deathRotbone"))return {ids:[...ids.filter(id=>id!=="deathRotbone"),"deathRotbone"],reason:"Rotbone acts after teammates advance, giving him a chance to heal their new positions. Check his reach on the map."};
 return {ids:[...ids],reason:null};
}

export function restoreDeployments(saved:unknown, teams:readonly (readonly string[])[]):Record<string,string[]> {
 const result:Record<string,string[]>={};
 if(!saved || typeof saved!=="object" || Array.isArray(saved))return result;
 for(const ids of teams){const key=deploymentKey(ids),value=(saved as Record<string,unknown>)[key];if(validDeployment(value,ids))result[key]=[...value];}
 return result;
}

export function moveDeployment(ids:readonly string[],id:string,delta:-1|1):string[] {
 const next=[...ids],index=next.indexOf(id),destination=index+delta;
 if(index<0 || destination<0 || destination>=next.length)return next;
 [next[index],next[destination]]=[next[destination]!,next[index]!];
 return next;
}
