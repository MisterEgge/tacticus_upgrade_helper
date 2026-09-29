export type UtilityTier="Core"|"Strong"|"Useful"|"Situational"|"No tracked signal";
export type UtilityInputs={name:string;communityScore:number|null;accountPriority:number;mainRaidCore:boolean;mainRaidFlex:boolean;raidCore:boolean;raidFlex:boolean;warOption:boolean;incompleteCampaign:boolean};
export type UtilityRating=UtilityInputs & {tier:UtilityTier;signals:string[]};

/** Account planning relevance from recorded evidence, not a universal combat tier list. */
export function rateCharacter(input:UtilityInputs):UtilityRating
{
    const signals=[
        ...(input.communityScore!==null?[`Community score ${input.communityScore}`]:[]),
        ...(input.accountPriority>0?[`Account priority ${input.accountPriority}`]:[]),
        ...(input.mainRaidCore?["Selected raid core"]:input.mainRaidFlex?["Selected raid flex"]:[]),
        ...(input.raidCore&&!input.mainRaidCore?["Raid meta core"]:input.raidFlex&&!input.mainRaidFlex?["Raid meta flex"]:[]),
        ...(input.warOption?["Buildable War source lineup"]:[]),
        ...(input.incompleteCampaign?["Required in unfinished Elite campaign"]:[])
    ];
    const tier:UtilityTier=input.mainRaidCore||(input.communityScore??0)>=3.5||input.accountPriority>=90?"Core":
        (input.communityScore??0)>=3||input.accountPriority>=80||input.raidCore?"Strong":
        (input.communityScore??0)>=2.7||input.accountPriority>=68||input.mainRaidFlex||input.incompleteCampaign?"Useful":
        input.raidFlex||input.warOption?"Situational":"No tracked signal";
    return {...input,tier,signals};
}

const tierOrder:Record<UtilityTier,number>={Core:4,Strong:3,Useful:2,Situational:1,"No tracked signal":0};
export function utilityAtLeast(tier:UtilityTier,minimum:"Useful"|"Situational"):boolean{return tierOrder[tier]>=tierOrder[minimum];}
