import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "../../../src/server/supabaseConfig";

export async function createSupabaseServerClient()
{

    const config = getSupabasePublicConfig();
    if (!config) throw new Error("Hosted authentication is not configured.");
    const cookieStore = await cookies();

    return createServerClient(config.url, config.publishableKey, {
        cookies: {
            getAll() { return cookieStore.getAll(); },
            setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>)
            {

                try
                {

                    for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);

                }
                catch
                {

                    // The proxy refreshes sessions for Server Components where cookies cannot be written.
                }

            }
        }
    });

}
