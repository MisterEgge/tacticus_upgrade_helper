import Link from "next/link";
import { signOutAction } from "../actions/auth";
import SyncAccountButton from "./SyncAccountButton";

export default function AuthAccountHeader({ playerName, connected = false, lastSynced }: { playerName?: string; connected?: boolean; lastSynced?: string })
{

    return <div className="accountBar"><div className="accountBarInner authAccountBar">
        <div className="accountIdentity"><Link href="/settings">Tacticus Upgrade Helper</Link></div>
        {connected ? <SyncAccountButton {...(lastSynced ? { lastSynced } : {})}/> : null}
        <div className="authSignedIn">
            <span>{playerName ?? "No player synced"}</span>
            <Link className="authSettingsLink" href="/settings">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/>
                    <path d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3h-.2a1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0 .9-3l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-.9 3Z"/>
                </svg>
                Settings
            </Link>
            <form action={signOutAction}><button type="submit">Sign out</button></form>
        </div>
    </div></div>;

}
