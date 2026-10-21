import RankBadge from "./RankBadge";
/** Rank references in checkpoint descriptions use the same verified artwork as tables. */
export default function RankText({text}:{text:string}) {
 return <>{text.split(/(\b(?:Stone|Iron|Bronze|Silver|Gold|Diamond|Adamantine) (?:III|II|I)\b)/g).map((part,index)=>/^(Stone|Iron|Bronze|Silver|Gold|Diamond|Adamantine) (III|II|I)$/.test(part)?<RankBadge key={index} rank={part}/>:part)}</>;
}
