-- Add pose column and baseline fields to client_progress_photos
-- This migration alters the existing table created by 20260204000000

-- Add new columns
alter table public.client_progress_photos
  add column if not exists pose text not null default 'unknown',
  add column if not exists first_photo_id text,
  add column if not exists latest_photo_id text,
  add column if not exists baseline_photo_id text,
  add column if not exists baseline_photo_url text,
  add column if not exists baseline_photo_taken_at timestamptz;

-- Drop old unique index (trainer_id, client_id) if it exists
drop index if exists public.client_progress_photos_trainer_client_idx;

-- Create new unique index (trainer_id, client_id, pose)
create unique index if not exists client_progress_photos_trainer_client_pose_idx
    on public.client_progress_photos(trainer_id, client_id, pose);
