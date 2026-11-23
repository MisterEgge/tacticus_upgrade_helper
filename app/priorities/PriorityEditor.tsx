"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import CharacterName from "../components/CharacterName";
import RankBadge from "../components/RankBadge";
import {DEFAULT_PRIORITIES, PRIORITY_MODES, PRIORITY_LABELS, type PlayerPriorities, type PriorityMode} from "../../src/domain/playerPriorities";

export default function PriorityEditor({initial, configured, storage, characters}: {initial: PlayerPriorities; configured: boolean; storage: "account" | "browser"; characters: Array<{id: string; name: string; rank: number}>}) {
    const [preferences, setPreferences] = useState(initial);
    const [query, setQuery] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();
    const update = (next: PlayerPriorities) => {setPreferences(next); setMessage(""); setError("");};
    const move = <T,>(values: T[], index: number, direction: number) => {const next = [...values]; [next[index], next[index + direction]] = [next[index + direction]!, next[index]!]; return next;};
    const save = async () => {
        setSaving(true); setError(""); setMessage("");
        try {
            const response = await fetch("/api/priorities", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(preferences)});
            const result = await response.json();
            if (!response.ok) throw new Error(result.error ?? "Could not save priorities.");
            setMessage("Priorities saved. Your recommendations now use this order.");
            router.refresh();
        } catch (cause) {setError(cause instanceof Error ? cause.message : "Could not save priorities.");}
        finally {setSaving(false);}
    };
    const pinned = preferences.characters.flatMap(id => characters.find(unit => unit.id === id) ?? []);
    const matches = query.trim() ? characters.filter(unit => !preferences.characters.includes(unit.id) && unit.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 12) : [];
    return <div className="priorityEditor">
        <section className="panel priorityModes"><h2>Invest in this order</h2><p className="sub">Move a mode up or down. Turn it off to leave it out of account recommendations.</p>
            <ol>{preferences.modes.map((mode, index) => <li key={mode}><strong>{PRIORITY_LABELS[mode]}</strong><div className="priorityControls">
                <button type="button" aria-label={`Move ${PRIORITY_LABELS[mode]} up`} disabled={saving || index === 0} onClick={() => update({...preferences, modes: move(preferences.modes, index, -1)})}>Up</button>
                <button type="button" aria-label={`Move ${PRIORITY_LABELS[mode]} down`} disabled={saving || index === preferences.modes.length - 1} onClick={() => update({...preferences, modes: move(preferences.modes, index, 1)})}>Down</button>
                <button type="button" disabled={saving} onClick={() => update({...preferences, modes: preferences.modes.filter(value => value !== mode)})}>Turn off {PRIORITY_LABELS[mode]}</button>
            </div></li>)}</ol>
            {PRIORITY_MODES.filter(mode => !preferences.modes.includes(mode)).map(mode => <button className="priorityEnable" type="button" key={mode} disabled={saving} onClick={() => update({...preferences, modes: [...preferences.modes, mode as PriorityMode]})}>Include {PRIORITY_LABELS[mode]}</button>)}
            {!preferences.modes.length ? <p>Only pinned characters will be prioritized.</p> : null}
            <p className="sub">Completed campaigns drop out automatically. Unknown campaign progress stays eligible until synced. <Link href="/guild-raid">Edit your Raid team</Link> or <Link href="/war-defense">review War teams</Link>.</p>
        </section>
        <section className="panel priorityCharacters"><h2>Characters first <small>(optional)</small></h2><p className="sub">Pin up to 30 owned characters above the mode order. Your teams stay the same; normal upgrade requirements still apply.</p>
            <ol>{pinned.map((unit, index) => <li key={unit.id}><CharacterName id={unit.id} name={unit.name}/><div className="priorityControls">
                <button type="button" aria-label={`Move ${unit.name} up`} disabled={saving || index === 0} onClick={() => update({...preferences, characters: move(preferences.characters, index, -1)})}>Up</button>
                <button type="button" aria-label={`Move ${unit.name} down`} disabled={saving || index === pinned.length - 1} onClick={() => update({...preferences, characters: move(preferences.characters, index, 1)})}>Down</button>
                <button type="button" aria-label={`Remove ${unit.name}`} disabled={saving} onClick={() => update({...preferences, characters: preferences.characters.filter(id => id !== unit.id)})}>Remove</button>
            </div></li>)}</ol>
            <label htmlFor="priority-search">Find a character</label><input id="priority-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search your synced roster"/>
            <ul className="prioritySearchResults">{matches.map(unit => <li key={unit.id}><CharacterName id={unit.id} name={unit.name}/><RankBadge rank={unit.rank}/><button type="button" aria-label={`Prioritize ${unit.name}`} disabled={saving || preferences.characters.length >= 30} onClick={() => {update({...preferences, characters: [...preferences.characters, unit.id]}); setQuery("");}}>Prioritize</button></li>)}</ul>
            {!characters.length ? <p className="sub">Sync Account to choose individual characters.</p> : query.trim() && !matches.length ? <p className="sub">No matching unpinned characters.</p> : null}
        </section>
        <div className="prioritySave"><button type="button" disabled={saving} onClick={save}>{saving ? "Saving…" : configured ? "Update priorities" : "Set priorities"}</button><button type="button" disabled={saving} onClick={() => update({...DEFAULT_PRIORITIES, modes: [...DEFAULT_PRIORITIES.modes], characters: []})}>Restore defaults</button>
            <p className="sub">{storage === "account" ? "Saved to your signed-in account across devices." : "Saved in this browser for the local app."} Saving updates account recommendations; specific mode and full-roster views remain available.</p>
            {message ? <p role="status">{message}</p> : null}{error ? <p role="alert">{error}</p> : null}
        </div>
    </div>;
}
