-- Create client_progress_photos table for storing per-client first/latest progress photo metadata
create table if not exists public.client_progress_photos (
    id uuid default gen_random_uuid() primary key,
    trainer_id uuid not null references auth.users(id) on delete cascade,
    client_id uuid not null references public.clients(id) on delete cascade,
    trainerize_user_id bigint not null,
    first_photo_url text,
    first_photo_taken_at timestamptz,
    latest_photo_url text,
    latest_photo_taken_at timestamptz,
    last_synced_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Unique composite index for idempotent upserts
create unique index if not exists client_progress_photos_trainer_client_idx
    on public.client_progress_photos(trainer_id, client_id);

-- Indexes for lookups
create index if not exists client_progress_photos_trainer_id_idx
    on public.client_progress_photos(trainer_id);

create index if not exists client_progress_photos_client_id_idx
    on public.client_progress_photos(client_id);

-- Enable RLS
alter table public.client_progress_photos enable row level security;

-- RLS policies
create policy "Trainers can view their own progress photos"
    on public.client_progress_photos for select
    to authenticated
    using (trainer_id = auth.uid());

create policy "Trainers can insert their own progress photos"
    on public.client_progress_photos for insert
    to authenticated
    with check (trainer_id = auth.uid());

create policy "Trainers can update their own progress photos"
    on public.client_progress_photos for update
    to authenticated
    using (trainer_id = auth.uid())
    with check (trainer_id = auth.uid());

create policy "Trainers can delete their own progress photos"
    on public.client_progress_photos for delete
    to authenticated
    using (trainer_id = auth.uid());

-- updated_at trigger
create trigger handle_client_progress_photos_updated_at
    before update on public.client_progress_photos
    for each row
    execute procedure public.handle_updated_at();
