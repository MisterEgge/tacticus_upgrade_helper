import AuthForm from "../components/AuthForm";
import { getSupabasePublicConfig } from "../../src/server/supabaseConfig";

export default function ForgotPassword()
{

    return <main className="authPage"><AuthForm mode="forgot-password" configured={!!getSupabasePublicConfig()}/></main>;

}
