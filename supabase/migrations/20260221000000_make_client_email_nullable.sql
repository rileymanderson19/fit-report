-- Make email column nullable in clients table
-- Trainerize API returns email as optional; not all fitness clients have emails on file.
ALTER TABLE public.clients ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.clients ALTER COLUMN email SET DEFAULT NULL;
