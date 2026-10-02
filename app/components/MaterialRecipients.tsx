"use client";
import Link from "next/link";
import { useState } from "react";
import type { MaterialRecipient } from "../../src/domain/materialCompletion";

export default function MaterialRecipients({ recipients }: { recipients: MaterialRecipient[] }) {
    const [expanded, setExpanded] = useState(false);
    return <details className="referenceDetails" onToggle={event => setExpanded(event.currentTarget.open)}>
        <summary>{recipients.length} characters</summary>
        {expanded && <ul>{recipients.map(recipient => <li key={recipient.id}>
            <Link href={`/characters/${encodeURIComponent(recipient.id)}`}>{recipient.name}</Link>
            <small>{recipient.owned ? "Owned" : "Unowned"} · {recipient.remaining.toLocaleString()} remaining
                {recipient.remaining > 0 && ` (${recipient.direct.toLocaleString()} direct + ${recipient.crafting.toLocaleString()} through crafting)`}
                {` · ${recipient.lifetime.toLocaleString()} total through ceiling`}</small>
        </li>)}</ul>}
    </details>;
}
