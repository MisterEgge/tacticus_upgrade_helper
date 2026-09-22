"use client";

import { useState, type ReactNode } from "react";

type Props = {
    status: string;
    name: string;
    progressLabel: ReactNode;
    children: ReactNode;
    defaultOpen?: boolean;
};

export default function CampaignSection({ status, name, progressLabel, children, defaultOpen = false }: Props)
{

    const [open, setOpen] = useState(defaultOpen);
    return <section className="panel detailPanel campaignSection">
        <button type="button" className="campaignSectionToggle" onClick={() => setOpen(value => !value)} aria-expanded={open}>
            <div><p className="eyebrow">{status.toUpperCase()}</p><h2>{name} Elite</h2></div>
            <div className="campaignSectionStatus"><div className="power">{progressLabel}</div><span className="campaignChevron" aria-hidden="true">{open ? "▴" : "▾"}</span></div>
        </button>
        {open ? <div className="campaignSectionBody">{children}</div> : null}
    </section>;

}
