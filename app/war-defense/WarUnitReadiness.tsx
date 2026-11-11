import RankBadge from "../components/RankBadge";
import ProgressionBadge from "../components/ProgressionBadge";
import RarityBadge from "../components/RarityBadge";
import { ResourceIcon } from "../components/ResourceName";
import { abilityLevelCap } from "../../src/domain/abilityCosts";
import {warTierAbilityCap,warTierMinimumRank,warTierProgressionCap,warTierProgressionMet} from "../../src/domain/warReadiness";
import {warGearStatus,type WarGearCap} from "../../src/domain/warGear";
import {progressionLabel} from "../../src/domain/characterProgression";

type WarUnit = {
    rank:number|null;
    rarity?:string|undefined;
    progressionIndex?:number|undefined;
    activeLevel:number|null;
    passiveLevel:number|null;
    items:Array<{slotId:string;id:string;rarity?:string;level:number;name?:string}>;
};

function AbilityLevel({kind,level,cap,tier}:{kind:"active"|"passive";level:number|null;cap:number|null;tier:WarGearCap})
{
    const maxed=cap!==null&&level!==null&&level>=cap;

    return <span className={`warAbilityLevel ${kind}${maxed?" maxed":" needs-upgrade"}`} role="img" aria-label={`${kind} ability level ${level??"unknown"} of ${tier} lineup cap ${cap??"unknown"}${maxed?", cap met":""}`} title={`${kind} ability`}>
        <svg viewBox="0 0 24 24" aria-hidden="true">{kind==="active"
            ? <path d="M14.4 2.5 6 13h5l-1 8.5L18 11h-5l1.4-8.5Z"/>
            : <><path d="M12 2.5 20 7v7l-8 7.5L4 14V7l8-4.5Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></>
        }</svg>
        <strong>{level??"?"}<small>/{cap??"?"}</small></strong>
        {maxed?<span className="warAbilityMaxed" aria-hidden="true">✓</span>:null}
    </span>;
}

export default function WarUnitReadiness({unit,tier="gold"}:{unit:WarUnit;tier?:WarGearCap})
{
    const tierAbilityCap=warTierAbilityCap(tier);
    const abilityCap=unit.rarity?Math.min(abilityLevelCap(unit.rarity)??tierAbilityCap,tierAbilityCap):null;
    const equipped=["Slot1","Slot2","Slot3"].map(slotId=>unit.items.find(item=>item.slotId===slotId));
    const gearStatus=warGearStatus(unit.items,tier);
    const progressionCap=warTierProgressionCap(tier);
    const progressionReady=unit.progressionIndex!==undefined&&warTierProgressionMet(unit.progressionIndex,tier);
    const rankReady=unit.rank!==null&&unit.rank>=warTierMinimumRank(tier);

    return <div className="warUnitReadiness">
        <div className="warUnitRank">
            <span className={`warReadinessMark warRankStatus${rankReady?" ready":" needs-upgrade"}`} aria-label={`${rankReady?"Meets":"Below"} ${tier==="silver"?"Silver I":"Gold I"} minimum rank`} title={`${rankReady?"Meets":"Below"} ${tier==="silver"?"Silver I":"Gold I"} minimum rank`}>
                <RankBadge rank={unit.rank??undefined}/>
                <span className="warRankFloor" aria-hidden="true"><RankBadge rank={warTierMinimumRank(tier)} decorative/></span>
            </span>
            {unit.progressionIndex!==undefined
                ? <span className={`warReadinessMark warProgressionStatus${progressionReady?" ready":" needs-upgrade"}`} aria-label={`${progressionLabel(unit.progressionIndex)}${progressionReady?`, ${tier} lineup cap ${progressionLabel(progressionCap)} met`:`, below ${tier} lineup cap ${progressionLabel(progressionCap)}`}`} title={`${progressionLabel(unit.progressionIndex)} → ${progressionLabel(progressionCap)} ${tier} lineup cap`}>
                    <ProgressionBadge index={unit.progressionIndex}/>
                    {unit.progressionIndex!==progressionCap?<><span className="warProgressionArrow" aria-hidden="true">›</span><ProgressionBadge index={progressionCap}/></>:null}
                </span>
                : <span className="warProgressionUnknown">{unit.rarity??"Unknown"}</span>}
        </div>
        <div className="warAbilityLevels">
            <AbilityLevel kind="active" level={unit.activeLevel===null||abilityCap===null?unit.activeLevel:Math.min(unit.activeLevel,abilityCap)} cap={abilityCap} tier={tier}/>
            <AbilityLevel kind="passive" level={unit.passiveLevel===null||abilityCap===null?unit.passiveLevel:Math.min(unit.passiveLevel,abilityCap)} cap={abilityCap} tier={tier}/>
        </div>
        <div className="warUnitGear" aria-label="Equipped gear">
            {equipped.map((item,index)=>{
                const ready=item!==undefined&&!gearStatus.missing.some(missing=>missing.slotId===item.slotId);
                const label=item?`${item.name??item.id}, ${item.rarity??"Unknown"} level ${item.level}${ready?`, ${tier} gear cap met`:", below gear cap"}`:`Empty equipment slot ${index+1}`;
                return <span className={`warReadinessMark warGearItem${ready?" ready":" needs-upgrade"}${item?"":" empty"}`} key={index} title={label} aria-label={label}>
                    {item?<><ResourceIcon id={item.id}/><RarityBadge rarity={item.rarity??"Unknown"} decorative/><small>{item.level}</small></>:<span aria-hidden="true">+</span>}
                </span>;
            })}
        </div>
    </div>;
}
