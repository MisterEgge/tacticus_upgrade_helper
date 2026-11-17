"use client";

import Link from "next/link";
import CharacterName from "../components/CharacterName";
import EquipmentSlot from "../components/EquipmentSlot";
import ResourceName from "../components/ResourceName";
import type { ReactNode } from "react";

export type EquipmentOpportunity = {
    id: string;
    name: string;
    quantity: number;
    quantityLabel?: string;
    slots: string[];
    recipients: Array<{
        character: string;
        characterId?: string;
    }>;
    action: ReactNode;
};

export default function EquipmentOpportunityGrid({ items }: { items: EquipmentOpportunity[] })
{

    return <div className="equipmentOpportunityGrid">
        {items.map(item => {
            const recipients = [...new Map(item.recipients.map(recipient => [recipient.characterId ?? recipient.character, recipient])).values()];
            return <article className="equipmentOpportunityCard" key={item.id} aria-label={`${item.name}: ${item.quantity} ${item.quantity === 1 ? "copy" : "copies"} ${item.quantityLabel ?? "needed"}`}>
                <header className="equipmentOpportunityHeader">
                    <Link className="sourceLink" href={`/sources?item=${encodeURIComponent(item.id)}`}>
                        <ResourceName id={item.id} name={item.name}/>
                    </Link>
                    <span className="equipmentOpportunityQuantity"><strong>{item.quantity}</strong><small>{item.quantityLabel ?? (item.quantity === 1 ? "copy" : "copies")}</small></span>
                </header>
                <div className="equipmentOpportunitySlots">{item.slots.map(slotId => <EquipmentSlot key={slotId} slotId={slotId}/>)}</div>
                <div className="equipmentOpportunityAction">{item.action}</div>
                <details className="equipmentOpportunityRecipients">
                    <summary>Needs it ({recipients.length})</summary>
                    <ul>
                        {recipients.map(recipient => <li key={recipient.characterId ?? recipient.character}>
                            <Link className="characterLink" href={`/characters/${encodeURIComponent(recipient.characterId ?? recipient.character)}#equipment`}>
                                <CharacterName name={recipient.character} id={recipient.characterId}/>
                            </Link>
                        </li>)}
                    </ul>
                </details>
            </article>;
        })}
    </div>;

}
