export type RaidPowerEntry={userId:string;startedOn:string|number;heroDetails:Array<{unitId:string;power:number}>};

export function latestRaidPowerByUnit(entries:RaidPowerEntry[],userId:string|undefined):Map<string,number>
{
    if(!userId)return new Map();
    const latest=new Map<string,{startedOn:number;power:number}>();
    for(const entry of entries)
    {
        if(entry.userId!==userId)continue;
        const startedOn=typeof entry.startedOn==="number"?entry.startedOn:Date.parse(entry.startedOn);
        if(!Number.isFinite(startedOn))continue;
        for(const hero of entry.heroDetails)
        {
            const existing=latest.get(hero.unitId);
            if(!existing||startedOn>existing.startedOn)latest.set(hero.unitId,{startedOn,power:hero.power});
        }
    }
    return new Map([...latest].map(([unitId,value])=>[unitId,value.power]));
}
