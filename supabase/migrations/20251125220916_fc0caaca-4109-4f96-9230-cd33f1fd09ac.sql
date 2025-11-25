-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'to_do' CHECK (status IN ('to_do', 'in_progress', 'done')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  vaga_id UUID REFERENCES public.vagas(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  candidato_id UUID REFERENCES public.candidatos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can do everything
CREATE POLICY "Admins can manage all tasks"
ON public.tasks
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view tasks they created or are assigned to
CREATE POLICY "Users can view own tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by OR 
  auth.uid() = assignee_id OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Users can create tasks
CREATE POLICY "Users can create tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by AND
  (has_role(auth.uid(), 'admin'::app_role) OR 
   has_role(auth.uid(), 'recrutador'::app_role) OR 
   has_role(auth.uid(), 'cs'::app_role))
);

-- Users can update tasks they created or are assigned to
CREATE POLICY "Users can update own tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  auth.uid() = created_by OR 
  auth.uid() = assignee_id OR
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  auth.uid() = created_by OR 
  auth.uid() = assignee_id OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Users can delete tasks they created
CREATE POLICY "Users can delete own tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (
  auth.uid() = created_by OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_tasks_updated_at();

-- Create notification function for task assignments
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if assignee changed and is not the creator
  IF (TG_OP = 'INSERT' OR OLD.assignee_id IS DISTINCT FROM NEW.assignee_id) 
     AND NEW.assignee_id IS NOT NULL 
     AND NEW.assignee_id != NEW.created_by THEN
    
    INSERT INTO public.notifications (user_id, kind, title, body, job_id)
    VALUES (
      NEW.assignee_id,
      'tarefa',
      'Nova tarefa atribuída',
      format('Você foi atribuído à tarefa: %s', NEW.title),
      NEW.vaga_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER task_assignment_notification
AFTER INSERT OR UPDATE OF assignee_id ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.notify_task_assignment();