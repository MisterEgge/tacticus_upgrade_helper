export type UtilityTier="Core"|"Strong"|"Useful"|"Situational"|"Low priority";
export type UtilityInputs={name:string;communityScore:number|null;communityTeams?:string[];accountPriority:number;accountNote?:string|null;priorityModes?:string[];mainRaidCore:boolean;mainRaidFlex:boolean;raidCore:boolean;raidFlex:boolean;warOption:boolean;incompleteCampaign:boolean};
export type UtilityRating=UtilityInputs & {tier:UtilityTier;signals:string[]};

/** Account planning relevance from recorded evidence, not a universal combat tier list. */
export function rateCharacter(input:UtilityInputs):UtilityRating
{
    const signals=[
        ...(input.communityScore!==null?[`Community score ${input.communityScore}`]:[]),
        ...(input.communityTeams?.length?[`Community team fit: ${input.communityTeams.join(", ")}`]:[]),
        ...(input.accountPriority>0?[input.accountNote?`Roster plan (${input.accountPriority}): ${input.accountNote}`:`Account priority ${input.accountPriority}`]:[]),
        ...(input.priorityModes??[]).map(mode=>`${mode} focus`),
        ...(input.mainRaidCore?["Selected raid core"]:input.mainRaidFlex?["Selected raid flex"]:[]),
        ...(input.raidCore&&!input.mainRaidCore?["Raid meta core"]:input.raidFlex&&!input.mainRaidFlex?["Raid meta flex"]:[]),
        ...(input.warOption?["Buildable War source lineup"]:[]),
        ...(input.incompleteCampaign?["Required in unfinished Elite campaign"]:[])
    ];
    const lreFocus=input.priorityModes?.includes("LRE")??false;
    const tier:UtilityTier=input.mainRaidCore||(input.communityScore??0)>=3.5||input.accountPriority>=90?"Core":
        (input.communityScore??0)>=3||input.accountPriority>=80||input.raidCore?"Strong":
        (input.communityScore??0)>=2.7||input.accountPriority>=68||input.mainRaidFlex||input.incompleteCampaign||lreFocus?"Useful":
        input.raidFlex||input.warOption||input.communityTeams?.length||(input.priorityModes??[]).length>0?"Situational":"Low priority";
    if(tier==="Low priority")signals.push("Low priority for this roster · leave at the current rank unless you enjoy using them or a current LRE track needs them.");
    return {...input,tier,signals};
}

const tierOrder:Record<UtilityTier,number>={Core:4,Strong:3,Useful:2,Situational:1,"Low priority":0};
export function utilityAtLeast(tier:UtilityTier,minimum:"Useful"|"Situational"):boolean{return tierOrder[tier]>=tierOrder[minimum];}
