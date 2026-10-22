"use client";
import Link from "next/link";
import type {ReactNode} from "react";
import {useGearTransfers,type ReallocationProps} from "../reallocation/ReallocationPlanner";
import ResourceName from "./ResourceName";

export default function GearTransferSource({context,characterId,slotId,children}:{context:ReallocationProps;characterId:string;slotId:string;children:ReactNode}){
 const {transfers}=useGearTransfers(context);
 const transfer=transfers.find(item=>item.recipientId===characterId&&item.recipientSlot===slotId);
 return transfer?<div className="equipmentSlotAction"><strong>Move <ResourceName id={transfer.itemId} name={transfer.itemName}/> from <Link href={`/characters/${encodeURIComponent(transfer.characterId)}`}>{transfer.character}</Link></strong><small>Level {transfer.level} · equip in-game, then sync</small></div>:children;
}
