-- Add Google Tasks API fields to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS google_task_id TEXT,
ADD COLUMN IF NOT EXISTS google_task_synced BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS google_task_last_sync TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS google_task_list_id TEXT DEFAULT '@default',
ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'task' CHECK (task_type IN ('task', 'meeting'));

-- Create index for Google Task ID
CREATE INDEX IF NOT EXISTS idx_tasks_google_task_id ON public.tasks(google_task_id) WHERE google_task_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.tasks.task_type IS 'Type: task (syncs to Google Tasks) or meeting (syncs to Google Calendar)';