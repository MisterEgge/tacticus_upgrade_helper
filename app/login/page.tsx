import AuthForm from "../components/AuthForm";
import { getSupabasePublicConfig } from "../../src/server/supabaseConfig";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> })
{

    const params = await searchParams;
    return <main className="authPage"><AuthForm mode="login" next={params.next} configured={!!getSupabasePublicConfig()}/>{params.error === "verification" ? <p className="authError">That email verification or password-reset link is invalid or expired. Request a new link.</p> : null}</main>;

}
