"use client";

import { useEffect, useState } from "react";

type Props = {
    campaign: string;
    finalBattle: number | null;
};

export default function ThreeStarProgress({ campaign, finalBattle }: Props)
{

    const storageKey = `tacticus:campaign-three-star:${campaign}`;
    const [value, setValue] = useState("");

    useEffect(() =>
    {

        setValue(window.localStorage.getItem(storageKey) ?? "");

    }, [storageKey]);

    function update(next: string)
    {

        setValue(next);
        if (next) window.localStorage.setItem(storageKey, next);
        else window.localStorage.removeItem(storageKey);

    }

    const max = finalBattle ?? 40;
    return <div className="campaignThreeStar">
        <label htmlFor={`three-star-${campaign}`}><strong>Highest 3★ mission</strong></label>
        <select id={`three-star-${campaign}`} value={value} onChange={event => update(event.target.value)}>
            <option value="">Not entered</option>
            {Array.from({ length: max }, (_, index) => index + 1).map(mission => <option key={mission} value={mission}>{mission === max ? `${mission} — Complete` : mission}</option>)}
        </select>
        <small>The game API does not report mission stars, so this value is saved in this browser.</small>
    </div>;

}
