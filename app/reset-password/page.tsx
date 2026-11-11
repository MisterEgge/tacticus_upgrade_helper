import AuthForm from "../components/AuthForm";
import { getSupabasePublicConfig } from "../../src/server/supabaseConfig";

export default function ResetPassword()
{

    return <main className="authPage"><AuthForm mode="reset-password" configured={!!getSupabasePublicConfig()}/></main>;

}
