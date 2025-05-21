-- Backup existing profiles data if table exists
do $$
begin
    if exists (select from pg_tables where schemaname = 'public' and tablename = 'profiles') then
        create temp table profiles_backup as select * from public.profiles;
    end if;
end $$;

-- Drop existing trigger and function if they exist
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user;

-- Create profiles table if it doesn't exist
create table if not exists public.profiles (
    id uuid primary key,
    updated_at timestamp with time zone default timezone('utc'::text, now()),
    username text,
    full_name text,
    avatar_url text,
    trainerize_username text,
    trainerize_password text,
    trainerize_id text
);

-- Add foreign key if it doesn't exist
do $$
begin
    if not exists (
        select 1
        from information_schema.table_constraints
        where constraint_name = 'profiles_id_fkey'
    ) then
        alter table public.profiles
        add constraint profiles_id_fkey
        foreign key (id)
        references auth.users(id)
        on delete cascade;
    end if;
end $$;

-- Enable RLS
alter table public.profiles enable row level security;

-- Drop existing policies
drop policy if exists "Public profiles are viewable by everyone" on profiles;
drop policy if exists "Users can insert their own profile" on profiles;
drop policy if exists "Users can update own profile" on profiles;

-- Create policies
create policy "Public profiles are viewable by everyone"
    on profiles for select
    using ( true );

create policy "Users can insert their own profile"
    on profiles for insert
    with check ( auth.uid() = id );

create policy "Users can update own profile"
    on profiles for update
    using ( auth.uid() = id );

-- Create a more resilient trigger function
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
    default_name text;
begin
    -- Extract name from email or use a default
    default_name := coalesce(
        new.raw_user_meta_data->>'full_name',
        split_part(new.email, '@', 1),
        'New User'
    );
    
    -- Insert with conflict handling
    insert into public.profiles (id, full_name, avatar_url)
    values (
        new.id,
        default_name,
        coalesce(new.raw_user_meta_data->>'avatar_url', null)
    )
    on conflict (id) do update
    set
        full_name = excluded.full_name,
        avatar_url = excluded.avatar_url,
        updated_at = now();
        
    return new;
exception when others then
    -- Log error details to Postgres logs
    raise warning 'Error in handle_new_user trigger: %', SQLERRM;
    -- Continue with user creation even if profile creation fails
    return new;
end;
$$;

-- Create trigger
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- Restore data if we had a backup
do $$
begin
    if exists (select from pg_tables where schemaname = 'pg_temp' and tablename = 'profiles_backup') then
        insert into public.profiles
        select * from profiles_backup
        on conflict (id) do nothing;
        
        drop table profiles_backup;
    end if;
end $$; 