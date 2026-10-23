/** Stable team order resolves stale conflicting saves without assigning a machine twice. */
export function restoreWarMachines(saved:unknown,teams:string[],owned:ReadonlySet<string>):Record<string,string>{
 if(!saved||typeof saved!=="object"||Array.isArray(saved))return {};
 const result:Record<string,string>={},used=new Set<string>();
 for(const team of teams){
  const machine=(saved as Record<string,unknown>)[team];
  if(typeof machine!=="string"||!owned.has(machine)||used.has(machine))continue;
  result[team]=machine;used.add(machine);
 }
 return result;
}

export function warMachineAvailable(selected:Record<string,string>,team:string,machine:string):boolean{
 return !machine||!Object.entries(selected).some(([holder,id])=>holder!==team&&id===machine);
}
