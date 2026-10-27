export function equipmentSlotLabel(slotId:string):string {
 const number=/^Slot([123])$/.exec(slotId)?.[1];
 return number?`Slot ${number}`:slotId;
}

export default function EquipmentSlot({slotId}:{slotId:string}){
 return <span className="equipmentSlotBadge">{equipmentSlotLabel(slotId)}</span>;
}
