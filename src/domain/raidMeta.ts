export type RaidRecommendation = { flex: string[]; lineup: string[]; replays: number; machine: string; sourceUrl: string; sourceUpdatedOn: string; reviewedOn: string };
export type RaidMachineRecommendation = { name: string; alternatives: string[]; sourceUrl: string; reviewedOn: string; note: string };
export type RaidTeam = { core: string[]; flex: string[]; fallbacks?: string[]; excluded?: string[]; excludedMachines?: string[]; restrictionNote?: string; fallbackNote?: string; machine?: RaidMachineRecommendation; recommendation?: RaidRecommendation };
export type RaidBossMeta = Record<string, Record<string, RaidTeam>>;

// Reuse the archetype's composition without carrying another boss's replay or
// machine recommendation into the new matchup.
const templateBosses:Record<string,string>={
    "Big Hit":"Avatar of Khaine", Lavistodes:"Screamer-Killer", Custodes:"Magnus",
    "Ad-Mech":"Riptide", Psyker:"Avatar of Khaine", "Battle Suit":"Avatar of Khaine",
    "Multi-Hit":"Belisarius Cawl", Terminus:"Ghazghkull",
};
const restrictedFaction:Record<string,string>={
    "Avatar of Khaine":"Aeldari", "Belisarius Cawl":"Adeptus Mechanicus",
    Ghazghkull:"Orks", "Hive Tyrant":"Tyranids", Magnus:"Thousand Sons",
    Mortarion:"Death guard", Riptide:"T'au Empire", "Rogal Dorn":"Astra Militarum",
    "Screamer-Killer":"Tyranids", Szarekh:"Necrons", Tervigon:"Tyranids",
};

export function expandRaidCompositions(bosses:RaidBossMeta,characters:readonly {name:string;faction:string}[]):RaidBossMeta{
    return Object.fromEntries(Object.entries(bosses).map(([boss,options])=>{
        const references=Object.values(options);
        const blocked=characters.filter(character=>character.faction===restrictedFaction[boss]).map(character=>character.name);
        const excludedMachines=[...new Set(references.flatMap(team=>team.excludedMachines??[]))];
        const restrictionNote=references.find(team=>team.restrictionNote)?.restrictionNote;
        const added=Object.entries(templateBosses).flatMap(([name,sourceBoss])=>{
            const template=bosses[sourceBoss]?.[name];
            if(options[name]||!template)return [];
            return [[name,{
                core:template.core,flex:template.flex,fallbacks:template.fallbacks??[],
                excluded:name==="Ad-Mech"?[...blocked,"Trajann"]:blocked,excludedMachines,
                fallbackNote:"General team composition for this boss. Boss-specific replay results are unavailable.",
                ...(restrictionNote?{restrictionNote}:{}),
            }]] as const;
        });
        return [boss,{
            ...Object.fromEntries(Object.entries(options).map(([name,team])=>[name,{...team,excluded:[...new Set([...(team.excluded??[]),...blocked])]}])),
            ...Object.fromEntries(added),
        }];
    }));
}
