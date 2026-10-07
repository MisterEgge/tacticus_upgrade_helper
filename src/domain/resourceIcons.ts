type NamedIcon={image:string;name:string;background?:string;fallback?:boolean};
export type ResourceIconCatalog={source:string;commit:string;icons:Record<string,NamedIcon>;missing:string[]};
const rarities=["Common","Uncommon","Rare","Epic","Legendary","Mythic"];
/** Asset paths are admitted only when present in the source tree. */
export function buildResourceIcons(commit:string,paths:Set<string>,recipes:Record<string,{material:string;icon?:string}>,equipment:Record<string,{name:string;type?:string}>):ResourceIconCatalog {
 const icons:Record<string,NamedIcon>={},missing:string[]=[];
 const add=(id:string,name:string,image:string,background?:string)=>{if(paths.has(image)&&(!background||paths.has(background)))icons[id]={name,image,...(background?{background}:{})};else missing.push(id);};
 for(const [id,item] of Object.entries(recipes))if(item.icon)add(id,item.material,item.icon);else missing.push(id);
 for(const [id,item] of Object.entries(equipment)){
  const normal=`equipment/ui_icon_item_${id}.png`,source=`snowprint_assets/equipment/ui_icon_item_${id}.png`;
  const matching=[...paths].filter(path=>path.toLowerCase()===source.toLowerCase());
  add(id,item.name,paths.has(normal)?normal:matching.length===1?matching[0]!:source);
  if(!icons[id]){
   const typeImages:Record<string,string>={I_Crit:"Crit_Item_Icon.webp",I_Block:"Block_Item_Icon.webp",I_Defensive:"Defensive_Item_Icon.webp",I_Booster_Crit:"Crit_Booster_Icon.webp",I_Booster_Block:"Block_Booster_Icon.webp"};
   const image=`equipment/${typeImages[item.type??""]??""}`;
   if(paths.has(image))icons[id]={name:item.name,image,fallback:true};
  }
 }
 for(const [index,rarity] of rarities.entries()){
  add(`xp${rarity}`,`${rarity} XP books`,`snowprint_assets/books/ui_icon_consumable_xp_book_${index}.png`);
  for(const alliance of ["Imperial","Xenos","Chaos"]){
   add(`badge:${alliance}:${rarity}`,`${alliance} ${rarity} badges`,`badges/${alliance.toLowerCase()}-${rarity.toLowerCase()}.png`);
   if(rarity!=="Common")add(`orb:${alliance}:${rarity}`,`${alliance} ${rarity} orbs`,`snowprint_assets/resources/ui_hero_ascension_orbs_${alliance.toLowerCase()}.png`,`snowprint_assets/resources/ui_hero_ascension_orbs_${rarity.toLowerCase()}.png`);
  }
  add(`itemAscensionResource_${rarity}`,`${rarity} forge badges`,`snowprint_assets/resources/ui_forge_badges_${rarity.toLowerCase()}.png`);
  add(`draft_abilityTokens${rarity}`,`${rarity} draft badges`,`snowprint_assets/resources/ui_icon_droptable_draft_abilityTokens${rarity}.png`);
  if(rarity!=="Common")add(`draft_ascensionOrbs${rarity}`,`${rarity} draft orbs`,`snowprint_assets/resources/ui_icon_droptable_draft_ascensionOrbs${rarity}.png`);
 }
 const currencies:Record<string,[string,string]>={gold:["Coins","coin_large"],guildCredits:["Guild Credits","guild_credits_large"],guildWarCurrency:["War Credits","guild_war_currency_large"],crusadeCurrency:["Crusade Credits","crusade_currency_large"],elderShopCurrency:["Archeotech","elder_shop_currency_large"],gems:["Blackstone","blackstone"],dust:["Salvage","salvage"],mythicDust:["Mythic salvage","mythic_salvage"],energy:["Energy","stamina_large"]};
 for(const [id,[name,file]] of Object.entries(currencies))add(id,name,`snowprint_assets/resources/ui_icon_resource_${file}.png`);
 add("shards","Regular shards","snowprint_assets/frames/ui_icon_character_shard_empty.png");
 add("mythicShards","Mythic shards","snowprint_assets/frames/ui_icon_character_shard_mythic.png");
 add("onslaughtToken","Onslaught tokens","snowprint_assets/misc/ui_icon_resource_token_onslaught.png");
 add("draft_machinesOfWarTokens","Draft machine components","snowprint_assets/resources/ui_icon_droptable_draft_machinesOfWarToken.png");
 for(const alliance of ["Imperial","Xenos","Chaos"])add(`machineComponents:${alliance}`,`${alliance} machine components`,`snowprint_assets/resources/ui_machines_of_war_tokens_${alliance.toLowerCase()}.png`);
 const poolIcons:Record<string,string>={I_Crit:"Crit_Item_Icon.webp",I_Block:"Block_Item_Icon.webp",I_Defensive:"Defensive_Item_Icon.webp",I_Booster_Crit:"Crit_Booster_Icon.webp",I_Booster_Block:"Block_Booster_Icon.webp"};
 for(const rarity of rarities)for(const [type,image] of Object.entries(poolIcons))add(`items${rarity}_${type}`,`${rarity} ${type.slice(2).replaceAll("_"," ")} equipment pool`,`equipment/${image}`);
 return {source:"https://github.com/svehera/tacticusplanner",commit,icons,missing};
}
export function resourceTextId(label:string):string|null {
 const words=label.replace(/^[\d,.]+\s+/,"").trim();
 const themed=/^(Imperial|Imperium|Xenos|Chaos)\s+(Common|Uncommon|Rare|Epic|Legendary|Mythic)\s+(orbs?|badges?)$/i.exec(words);
 if(themed){const alliance=themed[1]!.toLowerCase().startsWith("imper")?"Imperial":themed[1]!.toLowerCase()==="chaos"?"Chaos":"Xenos",rarity=rarities.find(r=>r.toLowerCase()===themed[2]!.toLowerCase())!;return `${themed[3]!.toLowerCase().startsWith("orb")?"orb":"badge"}:${alliance}:${rarity}`;}
 const forge=/^(Common|Uncommon|Rare|Epic|Legendary|Mythic) forge badges?$/i.exec(words);
 if(forge)return `itemAscensionResource_${rarities.find(r=>r.toLowerCase()===forge[1]!.toLowerCase())}`;
 return ({coins:"gold","guild credits":"guildCredits","war credits":"guildWarCurrency","crusade credits":"crusadeCurrency",archeotech:"elderShopCurrency",blackstone:"gems",salvage:"dust","mythic salvage":"mythicDust",energy:"energy",shards:"shards","regular shards":"shards","mythic shards":"mythicShards"} as Record<string,string>)[words.toLowerCase()]??null;
}
