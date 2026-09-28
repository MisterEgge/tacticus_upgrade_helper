type Team = { core:string[]; flex:string[]; members:{name:string;owned:boolean}[] };

// This is an account planning choice, not a five-member lineup observed in the source data.
export function suggestedRaidFlex(boss:string,teamName:string,team:Team):string[]
{
    if(boss!=="Avatar of Khaine"||teamName!=="Big Hit")return [];
    const available=new Set(team.members.filter(member=>member.owned).map(member=>member.name));
    if(team.core.some(name=>!available.has(name)))return [];
    return ["Aesoth","Gulgortz"].filter(name=>team.flex.includes(name)&&available.has(name)).slice(0,Math.max(0,5-team.core.length));
}
