-- Add slots_claimed column to volunteer_signups to support multi-slot signups
ALTER TABLE public.volunteer_signups ADD COLUMN IF NOT EXISTS slots_claimed int not null default 1 check (slots_claimed > 0);
