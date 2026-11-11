import AuthForm from "../components/AuthForm";
import { getSupabasePublicConfig } from "../../src/server/supabaseConfig";

export default function Signup()
{

    return <main className="authPage"><AuthForm mode="signup" configured={!!getSupabasePublicConfig()}/></main>;

}
