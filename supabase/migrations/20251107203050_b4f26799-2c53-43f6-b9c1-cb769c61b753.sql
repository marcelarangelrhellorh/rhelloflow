-- Create whatsapp_templates table
CREATE TABLE public.whatsapp_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view active templates"
ON public.whatsapp_templates
FOR SELECT
USING (auth.uid() IS NOT NULL AND active = true);

CREATE POLICY "Admins and recruiters can manage templates"
ON public.whatsapp_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'recrutador'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'recrutador'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_whatsapp_templates_updated_at
BEFORE UPDATE ON public.whatsapp_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates
INSERT INTO public.whatsapp_templates (key, name, content, description, created_by) VALUES
  ('convite_entrevista', 'Convite para Entrevista', 'Olá {{candidate_first_name}}! 👋

Aqui é {{recruiter_name}} da Rhello. Gostaria de convidar você para uma entrevista para a vaga de {{vacancy_title}}.

Você tem disponibilidade nos próximos dias?', 'Template para convidar candidatos para entrevistas', '00000000-0000-0000-0000-000000000000'),
  
  ('confirmacao_recebida', 'Confirmação de Recebimento', 'Olá {{candidate_first_name}}! 👋

Recebemos sua candidatura para a vaga de {{vacancy_title}}. Em breve {{recruiter_name}} entrará em contato.

Obrigado pelo interesse!', 'Template para confirmar recebimento de candidatura', '00000000-0000-0000-0000-000000000000'),
  
  ('reprovacao', 'Reprovação', 'Olá {{candidate_first_name}},

Agradecemos seu interesse na vaga de {{vacancy_title}}. Infelizmente, neste momento, decidimos seguir com outros candidatos.

Desejamos sucesso em sua busca!', 'Template para comunicar reprovação', '00000000-0000-0000-0000-000000000000'),
  
  ('atualizacao_processo', 'Atualização do Processo', 'Olá {{candidate_first_name}}! 👋

{{recruiter_name}} aqui. Gostaríamos de atualizar você sobre o processo seletivo para {{vacancy_title}}.

Você avançou para a próxima etapa! Parabéns! 🎉', 'Template para dar atualizações sobre o processo', '00000000-0000-0000-0000-000000000000');

-- Create index
CREATE INDEX idx_whatsapp_templates_active ON public.whatsapp_templates(active);