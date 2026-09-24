export type BadgeRarity="Common"|"Uncommon"|"Rare"|"Epic"|"Legendary"|"Mythic";
export type BadgeCost=Partial<Record<BadgeRarity,number>>;

const tierCosts:[BadgeRarity,number[]][]=[
 ["Common",[1,1,1,2,2,2,3]],
 ["Uncommon",[1,1,1,2,2,2,3,4,5]],
 ["Rare",[1,1,1,2,2,2,3,4,5]],
 ["Epic",[1,1,1,2,2,2,3,4,5]],
 ["Legendary",[1,1,1,2,2,2,3,3,4,5,6,7,8,9,10]],
 ["Mythic",[1,1,1,2,2,2,3,3,4,5]]
];
const byLevel=new Map<number,{rarity:BadgeRarity;amount:number}>(tierCosts.flatMap(([rarity,costs],index)=>costs.map((amount,offset)=>[2+offset+(index===0?0:index===1?7:index===2?16:index===3?25:index===4?34:49),{rarity,amount}] as const)));

export function badgeCostBetween(current:number|null,target:number):BadgeCost
{
 const cost:BadgeCost={};
 for(let level=Math.max(2,(current??target)+1);level<=target;level++){const step=byLevel.get(level);if(step)cost[step.rarity]=(cost[step.rarity]??0)+step.amount;}
 return cost;
}

export function totalBadgeCosts(costs:BadgeCost[]):BadgeCost{return costs.reduce<BadgeCost>((total,cost)=>{for(const[rarity,amount]of Object.entries(cost)as Array<[BadgeRarity,number]>)total[rarity]=(total[rarity]??0)+amount;return total;},{});}
