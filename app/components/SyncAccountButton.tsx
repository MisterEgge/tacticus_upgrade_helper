"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SyncAccountButton({ lastSynced }: { lastSynced?: string })
{

    const router = useRouter();
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string>();
    async function sync()
    {

        setSyncing(true);
        setError(undefined);
        try
        {

            const response = await fetch("/api/sync", { method: "POST" });
            const result = await response.json() as { ok: boolean; error?: string };
            if (!response.ok || !result.ok) throw new Error(result.error ?? "Account sync failed.");
            router.refresh();

        }
        catch (value)
        {

            setError(value instanceof Error ? value.message : "Account sync failed.");

        }
        finally
        {

            setSyncing(false);

        }

    }
    return <div className="syncAccount">
        <button type="button" onClick={sync} disabled={syncing}>{syncing ? "Syncing…" : "Sync Account"}</button>
        <small>{lastSynced ? `Last synced: ${new Date(lastSynced).toLocaleString()}` : "Account has not been synced yet."}</small>
        {error ? <small className="syncError">{error}</small> : null}
    </div>;

}
