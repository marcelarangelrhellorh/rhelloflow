-- Add Google Calendar sync fields to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS google_calendar_event_id text,
ADD COLUMN IF NOT EXISTS google_calendar_synced boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS google_calendar_last_sync timestamp with time zone,
ADD COLUMN IF NOT EXISTS sync_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS calendar_id text DEFAULT 'primary',
ADD COLUMN IF NOT EXISTS start_time time without time zone,
ADD COLUMN IF NOT EXISTS end_time time without time zone,
ADD COLUMN IF NOT EXISTS reminder_minutes integer DEFAULT 30;

-- Create index for sync queries
CREATE INDEX IF NOT EXISTS idx_tasks_google_sync ON public.tasks(google_calendar_event_id) WHERE google_calendar_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_sync_pending ON public.tasks(assignee_id, google_calendar_synced) WHERE sync_enabled = true;

-- Create sync_logs table
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete', 'sync_from_calendar', 'bulk_sync')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('success', 'error', 'pending')),
  error_message text,
  google_event_id text,
  details jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on sync_logs
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for sync_logs
CREATE POLICY "Users can view own sync logs" ON public.sync_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync logs" ON public.sync_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all sync logs" ON public.sync_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for sync_logs
CREATE INDEX IF NOT EXISTS idx_sync_logs_user ON public.sync_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_task ON public.sync_logs(task_id) WHERE task_id IS NOT NULL;