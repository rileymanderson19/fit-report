-- Create reports table
create table if not exists public.reports (
    id uuid default gen_random_uuid() primary key,
    client_id uuid not null references public.clients(id) on delete cascade,
    trainer_id uuid not null references auth.users(id) on delete cascade,
    report_data jsonb not null,
    date_range_start timestamp with time zone not null,
    date_range_end timestamp with time zone not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

-- Create index for faster lookups by client
create index if not exists reports_client_id_idx on public.reports(client_id);

-- Create index for faster lookups by trainer
create index if not exists reports_trainer_id_idx on public.reports(trainer_id);

-- Create index for faster date range queries
create index if not exists reports_date_range_idx on public.reports(date_range_start, date_range_end);

-- Enable RLS (Row Level Security)
alter table public.reports enable row level security;

-- Create policies
create policy "Trainers can view their own reports"
    on public.reports for select
    using (auth.uid() = trainer_id);

create policy "Trainers can insert their own reports"
    on public.reports for insert
    with check (auth.uid() = trainer_id);

create policy "Trainers can update their own reports"
    on public.reports for update
    using (auth.uid() = trainer_id)
    with check (auth.uid() = trainer_id);

create policy "Trainers can delete their own reports"
    on public.reports for delete
    using (auth.uid() = trainer_id);

-- Create updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger handle_reports_updated_at
    before update on public.reports
    for each row
    execute procedure public.handle_updated_at(); 