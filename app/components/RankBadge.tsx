import {RANK_NAMES,rankName} from "../../src/domain/ranks";
import GameBadge from "./GameBadge";

export default function RankBadge({rank}:{rank:number|string|undefined}) {
 const index=typeof rank==="number"?rank:RANK_NAMES.findIndex(name=>name===rank);
 const name=typeof rank==="number"?rankName(rank):rank??"Unknown rank";
 const valid=Number.isInteger(index)&&index>=0&&index<RANK_NAMES.length;
 const file=valid?`${RANK_NAMES[index]!.split(" ")[0]!.toLowerCase()}${index%3+1}`:null;
 return <GameBadge src={file?`/ranks/${file}.png`:null} label={name} kind="rank"/>;
}
