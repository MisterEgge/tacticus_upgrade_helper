"use client";
import Link from "next/link";
import type {ReactNode} from "react";
import {useGearTransfers,type ReallocationProps} from "../reallocation/ReallocationPlanner";
import ResourceName from "./ResourceName";
import {equipmentSlotLabel} from "./EquipmentSlot";

export default function GearTransferSource({context,characterId,slotId,children}:{context:ReallocationProps;characterId:string;slotId:string;children:ReactNode}){
 const {transfers}=useGearTransfers(context);
 const transfer=transfers.find(item=>item.recipientId===characterId&&item.recipientSlot===slotId);
 return transfer?<div className="equipmentSlotAction"><strong>Move <ResourceName id={transfer.itemId} name={transfer.itemName}/> from <Link href={`/characters/${encodeURIComponent(transfer.characterId)}`}>{transfer.character}</Link> ({equipmentSlotLabel(transfer.slotId)})</strong><small>Replace {transfer.replacesName}, level {transfer.replacesLevel}, in {equipmentSlotLabel(transfer.recipientSlot)} with this level {transfer.level} item.</small><small>Equip in-game, then sync.</small></div>:children;
}
