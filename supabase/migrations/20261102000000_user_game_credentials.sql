create table if not exists public.user_game_credentials (
    user_id uuid primary key references auth.users (id) on delete cascade,
    encrypted_api_key text not null,
    report_data jsonb,
    synced_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.user_game_credentials enable row level security;

revoke all on public.user_game_credentials from anon, authenticated;
grant select, insert, update, delete on public.user_game_credentials to authenticated;

create policy "Users can manage their own game credentials"
    on public.user_game_credentials
    for all
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
