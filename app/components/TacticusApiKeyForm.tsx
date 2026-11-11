"use client";

import { useActionState } from "react";
import {
    removeTacticusApiKeyAction,
    saveTacticusApiKeyAction,
    type GameAccountActionState
} from "../actions/gameAccount";

const initialState: GameAccountActionState = {};

export default function TacticusApiKeyForm({ connected, storageReady }: { connected: boolean; storageReady: boolean })
{

    const [saveState, saveAction, saving] = useActionState(saveTacticusApiKeyAction, initialState);
    const [removeState, removeAction, removing] = useActionState(removeTacticusApiKeyAction, initialState);

    return <div className="gameApiKeyForm">
        {storageReady ? <>
            <p className={connected ? "authSuccess" : "authNotice"} role="status">{connected ? "A Tacticus API key is saved for this account." : "No Tacticus API key is connected yet."}</p>
            <form action={saveAction} className="authForm">
                <label htmlFor="tacticus-api-key">{connected ? "Replace API key" : "Tacticus API key"}
                    <input id="tacticus-api-key" name="apiKey" type="password" autoComplete="new-password" maxLength={2048} required/>
                    <small>The key is checked with Tacticus, encrypted on this server, and never shown again.</small>
                </label>
                {saveState.error ? <p className="authError" role="alert">{saveState.error}</p> : null}
                {saveState.message ? <p className="authSuccess" role="status">{saveState.message}</p> : null}
                <button type="submit" disabled={saving || removing}>{saving ? "Verifying and saving…" : connected ? "Replace API key" : "Connect API key"}</button>
            </form>
            {connected ? <form action={removeAction} className="removeApiKeyForm">
                <button type="submit" disabled={saving || removing}>{removing ? "Removing…" : "Remove saved key"}</button>
                {removeState.error ? <p className="authError" role="alert">{removeState.error}</p> : null}
                {removeState.message ? <p className="authSuccess" role="status">{removeState.message}</p> : null}
            </form> : null}
        </> : <p className="authNotice" role="status">Account key storage is unavailable. Apply the API credential migration and verify Supabase permissions.</p>}
    </div>;

}
