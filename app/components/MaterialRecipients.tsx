"use client";
import Link from "next/link";
import { useState } from "react";
import type { MaterialRecipient } from "../../src/domain/materialCompletion";

export default function MaterialRecipients({ recipients }: { recipients: MaterialRecipient[] }) {
    const [expanded, setExpanded] = useState(false);
    return <details className="referenceDetails" onToggle={event => setExpanded(event.currentTarget.open)}>
        <summary>Used by {recipients.length}</summary>
        {expanded && <ul className="materialRecipientGrid">{recipients.map(recipient => <li key={recipient.id}>
            <Link href={`/characters/${encodeURIComponent(recipient.id)}`}>{recipient.name}</Link>
            <small>{recipient.owned ? "Owned" : "Unowned"} · {recipient.remaining.toLocaleString()} remaining</small>
        </li>)}</ul>}
    </details>;
}
