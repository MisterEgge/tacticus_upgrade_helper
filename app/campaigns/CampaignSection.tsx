"use client";

import { useEffect, useState, type ReactNode } from "react";

type Props = {
    status: string;
    name: string;
    progressLabel: ReactNode;
    finalBattle: number | null;
    children: ReactNode;
    defaultOpen?: boolean;
};

export default function CampaignSection({ status, name, progressLabel, finalBattle, children, defaultOpen = false }: Props)
{

    const [open, setOpen] = useState(defaultOpen);
    const [threeStar, setThreeStar] = useState<number | null>(null);
    const storageKey = `tacticus:campaign-three-star:${name}`;

    useEffect(() =>
    {

        const stored = window.localStorage.getItem(storageKey);
        const parsed = stored ? Number(stored) : NaN;
        setThreeStar(Number.isInteger(parsed) && parsed > 0 ? parsed : null);

        function onProgress(event: Event)
        {

            const detail = (event as CustomEvent<{ campaign: string; value: number | null }>).detail;
            if (detail?.campaign === name) setThreeStar(detail.value);

        }

        window.addEventListener("tacticus:campaign-three-star", onProgress);
        return () => window.removeEventListener("tacticus:campaign-three-star", onProgress);

    }, [name, storageKey]);

    const threeStarComplete = threeStar !== null && finalBattle !== null && threeStar >= finalBattle;
    const objective = threeStarComplete ? "3★ complete" : threeStar !== null ? `3★ through ${threeStar} · Next: ${threeStar + 1}` : null;
    const percent = threeStar !== null && finalBattle ? Math.min(100, Math.round((threeStar / finalBattle) * 100)) : 0;

    return <section className="panel detailPanel campaignSection">
        <button type="button" className="campaignSectionToggle" onClick={() => setOpen(value => !value)} aria-expanded={open}>
            <div><p className="eyebrow">{status.toUpperCase()}</p><h2>{name} Elite</h2>{objective ? <small className="campaignObjective">{objective}</small> : null}</div>
            <div className="campaignSectionStatus">
                {threeStar !== null && finalBattle !== null ? <div className="campaignStarSummary"><strong>{threeStar}/{finalBattle} 3★</strong><span><i style={{ width: `${percent}%` }}/></span></div> : null}
                <div className="power">{progressLabel}</div>
                <span className="campaignChevron" aria-hidden="true">{open ? "▴" : "▾"}</span>
            </div>
        </button>
        {open ? <div className="campaignSectionBody">{children}</div> : null}
    </section>;

}
