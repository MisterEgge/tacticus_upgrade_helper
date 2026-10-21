import GameBadge from "./GameBadge";
const rarities=new Set(["Common","Uncommon","Rare","Epic","Legendary","Mythic"]);
export default function RarityBadge({rarity,decorative=false}:{rarity:string;decorative?:boolean}) {
 return <GameBadge src={rarities.has(rarity)?`/rarity/${rarity.toLowerCase()}.png`:null} label={rarity} kind="rarity" decorative={decorative}/>;
}
