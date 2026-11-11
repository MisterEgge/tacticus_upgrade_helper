"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
    sendPasswordResetAction,
    signInAction,
    signUpAction,
    updatePasswordAction,
    type AuthActionState
} from "../actions/auth";

type Mode = "login" | "signup" | "forgot-password" | "reset-password";

const initialState: AuthActionState = {};

export default function AuthForm({ mode, next = "/settings", configured }: { mode: Mode; next?: string | undefined; configured: boolean })
{

    const action = mode === "login"
        ? signInAction
        : mode === "signup"
            ? signUpAction
            : mode === "forgot-password"
                ? sendPasswordResetAction
                : updatePasswordAction;
    const [state, formAction, pending] = useActionState(action, initialState);
    const heading = {
        login: "Welcome back",
        signup: "Create your account",
        "forgot-password": "Reset your password",
        "reset-password": "Choose a new password"
    }[mode];

    return <section className="authCard">
        <p className="eyebrow">TACTICUS UPGRADE HELPER</p>
        <h1>{heading}</h1>
        <p className="sub">{mode === "signup" ? "Sign up to create your private account." : mode === "login" ? "Sign in to your account." : mode === "forgot-password" ? "We’ll send a secure password-reset link to your email." : "Choose a new password for your account."}</p>
        {!configured ? <p className="authNotice" role="status">Hosted login is not configured on this server yet. Set the Supabase environment variables described in the README.</p> : null}
        <form action={formAction} className="authForm">
            {mode === "login" || mode === "signup" || mode === "forgot-password" ? <label>Email<input name="email" type="email" autoComplete="email" required disabled={!configured}/></label> : null}
            {mode === "login" || mode === "signup" || mode === "reset-password" ? <label>Password<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "login" ? 1 : 12} required disabled={!configured}/>{mode !== "login" ? <small>Use at least 12 characters.</small> : null}</label> : null}
            {mode === "signup" || mode === "reset-password" ? <label>Confirm password<input name="passwordConfirmation" type="password" autoComplete="new-password" minLength={12} required disabled={!configured}/></label> : null}
            {mode === "login" ? <input type="hidden" name="next" value={next}/> : null}
            {state.error ? <p className="authError" role="alert">{state.error}</p> : null}
            {state.message ? <p className="authSuccess" role="status">{state.message}</p> : null}
            <button type="submit" disabled={!configured || pending}>{pending ? "Please wait…" : mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : mode === "forgot-password" ? "Send reset link" : "Save password"}</button>
        </form>
        <nav className="authLinks" aria-label="Account options">
            {mode === "login" ? <><Link href="/forgot-password">Forgot password?</Link><Link href="/signup">Create an account</Link></> : null}
            {mode !== "login" ? <Link href="/login">Back to sign in</Link> : null}
        </nav>
    </section>;

}
