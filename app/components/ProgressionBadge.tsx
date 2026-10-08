import {progressionLabel,progressionRarity,progressionStars} from "../../src/domain/characterProgression";

/** Game art stays local so progression does not depend on a third-party image request. */
export default function ProgressionBadge({index}:{index:number}) {
 const rarity=progressionRarity(index),stars=progressionStars(index);
 if(!rarity||!stars)return <span>Unknown progression</span>;
 return <span className="progressionBadge" role="img" aria-label={progressionLabel(index)} title={progressionLabel(index)}>
  <span className={`rarity ${rarity.toLowerCase()}`} aria-hidden="true">{rarity}</span>
  {stars.count>0?<span className={`progressionStars ${stars.color}`} aria-hidden="true">{Array.from({length:stars.count},(_,position)=><img key={position} src={`/progression/${stars.color==="wings"?"mythic-wings":`${stars.color}-star`}.png`} alt="" width={stars.color==="wings"?50:stars.color==="blue"?40:18} height={18}/>)}</span>:null}
 </span>;
}
