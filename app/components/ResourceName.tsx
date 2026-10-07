"use client";
import icons from "../../data/game/resource-icons.json";
import {resourceTextId,type ResourceIconCatalog} from "../../src/domain/resourceIcons";
const catalog=icons as ResourceIconCatalog;
const asset=(path:string)=>`https://raw.githubusercontent.com/svehera/tacticusplanner/${catalog.commit}/src/assets/images/${path.split("/").map(encodeURIComponent).join("/")}`;

export function ResourceIcon({id}:{id:string}) {
 const icon=catalog.icons[id]??(id.startsWith("mythicShards_")?catalog.icons.mythicShards:id.startsWith("shards_")?catalog.icons.shards:undefined);
 return icon?<span className={`resourceIcon${icon.background?" resourceOrb":""}`} title={icon.fallback?"Equipment type icon · exact artwork unavailable":undefined} aria-hidden="true">{icon.background?<img src={asset(icon.background)} alt="" loading="lazy" onError={event=>{event.currentTarget.hidden=true;}}/>:null}<img src={asset(icon.image)} alt="" loading="lazy" onError={event=>{event.currentTarget.hidden=true;}}/></span>:null;
}
export default function ResourceName({id,name}:{id:string;name?:string}) {
 return <span className="resourceName" data-resource-id={id}><ResourceIcon id={id}/>{name??catalog.icons[id]?.name??id}</span>;
}
const resourceTokens=/(?:\d[\d,.]*\s+)?(?:Imperial|Imperium|Xenos|Chaos)\s+(?:Common|Uncommon|Rare|Epic|Legendary|Mythic)\s+(?:orbs?|badges?)\b|(?:\d[\d,.]*\s+)?(?:Common|Uncommon|Rare|Epic|Legendary|Mythic) forge badges?\b|(?:\d[\d,.]*\s+)?(?:Guild Credits|War Credits|Crusade Credits|Archeotech|Mythic salvage|Salvage|Coins|Blackstone|Energy|Mythic shards|regular shards|shards)\b/gi;
/** Decorate resource names inside existing cost/shortage text without changing it. */
export function ResourceText({text}:{text:string}) {
 const parts:React.ReactNode[]=[];let from=0;
 for(const match of text.matchAll(resourceTokens)){const start=match.index!,id=resourceTextId(match[0]);parts.push(text.slice(from,start));parts.push(id?<ResourceName key={start} id={id} name={match[0]}/>:match[0]);from=start+match[0].length;}
 parts.push(text.slice(from));return <>{parts}</>;
}
