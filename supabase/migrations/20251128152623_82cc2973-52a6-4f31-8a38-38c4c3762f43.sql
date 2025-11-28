-- Add Google Calendar fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS google_calendar_connected boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS google_access_token text,
ADD COLUMN IF NOT EXISTS google_refresh_token text,
ADD COLUMN IF NOT EXISTS google_token_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS google_calendar_last_sync timestamptz;

-- Create index for faster queries on connected users
CREATE INDEX IF NOT EXISTS idx_profiles_google_calendar_connected 
ON public.profiles(google_calendar_connected) 
WHERE google_calendar_connected = true;

-- Update RLS policies to allow users to update their own Google Calendar fields
-- (existing policies already allow users to update their own profile)