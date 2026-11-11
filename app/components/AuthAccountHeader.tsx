import Link from "next/link";
import { signOutAction } from "../actions/auth";
import SyncAccountButton from "./SyncAccountButton";

export default function AuthAccountHeader({ email, connected = false, lastSynced }: { email?: string; connected?: boolean; lastSynced?: string })
{

    return <div className="accountBar"><div className="accountBarInner authAccountBar">
        <div className="accountIdentity"><small>ACCOUNT</small><Link href="/settings">Tacticus Upgrade Helper</Link></div>
        {connected ? <SyncAccountButton {...(lastSynced ? { lastSynced } : {})}/> : null}
        <div className="authSignedIn"><span>{email ?? "Signed in"}</span><Link href="/settings">Account settings</Link><form action={signOutAction}><button type="submit">Sign out</button></form></div>
    </div></div>;

}
