create table if not exists public.user_profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    display_name text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "Users can view their own profile"
    on public.user_profiles for select
    to authenticated
    using ((select auth.uid()) = id);

create policy "Users can update their own profile"
    on public.user_profiles for update
    to authenticated
    using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);

create function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.user_profiles (id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
    return new;
end;
$$;

create trigger on_auth_user_created_profile
    after insert on auth.users
    for each row execute procedure public.handle_new_user_profile();
