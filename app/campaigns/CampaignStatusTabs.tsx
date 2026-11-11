"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import { campaignThreeStarComplete } from "../../src/domain/campaigns";
import ViewTabs from "../components/ViewTabs";

type Props = {
    sections: Array<{ name: string; finalBattle: number | null; content: ReactNode }>;
    inProgressContent: ReactNode;
};

export default function CampaignStatusTabs({ sections, inProgressContent }: Props)
{

    const [threeStarProgress, setThreeStarProgress] = useState<Record<string, number | null>>({});

    useEffect(() =>
    {

        const progress = Object.fromEntries(sections.map(({ name }) =>
        {

            const stored = window.localStorage.getItem(`tacticus:campaign-three-star:${name}`);
            const parsed = stored ? Number(stored) : NaN;
            return [name, Number.isInteger(parsed) && parsed > 0 ? parsed : null];

        }));
        setThreeStarProgress(progress);

        function onProgress(event: Event)
        {

            const detail = (event as CustomEvent<{ campaign: string; value: number | null }>).detail;
            if (detail && sections.some(section => section.name === detail.campaign))
            {

                setThreeStarProgress(current => ({ ...current, [detail.campaign]: detail.value }));

            }

        }

        window.addEventListener("tacticus:campaign-three-star", onProgress);
        return () => window.removeEventListener("tacticus:campaign-three-star", onProgress);

    }, [sections]);

    const completed = sections.filter(section => campaignThreeStarComplete(threeStarProgress[section.name], section.finalBattle));
    const inProgress = sections.filter(section => !campaignThreeStarComplete(threeStarProgress[section.name], section.finalBattle));

    return <ViewTabs label="Campaign status" defaultTab="In progress" tabs={[
        { label: "In progress", content: <>{inProgressContent}{inProgress.map(section => <Fragment key={section.name}>{section.content}</Fragment>)}{sections.length > 0 && inProgress.length === 0 ? <p className="empty">All tracked campaigns 3★ completed.</p> : null}</> },
        { label: "Completed", content: <>{completed.map(section => <Fragment key={section.name}>{section.content}</Fragment>)}{completed.length === 0 ? <p className="empty">No fully 3★ completed campaigns yet.</p> : null}</> }
    ]}/>;

}
