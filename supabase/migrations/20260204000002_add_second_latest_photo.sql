-- Add second_latest_photo columns to track the previous-to-latest photo for progress comparisons
alter table public.client_progress_photos
  add column if not exists second_latest_photo_id text,
  add column if not exists second_latest_photo_url text,
  add column if not exists second_latest_photo_taken_at timestamptz;
