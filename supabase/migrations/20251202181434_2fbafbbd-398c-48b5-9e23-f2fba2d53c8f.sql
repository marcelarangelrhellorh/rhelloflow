-- Add pipeline_stage column to empresas table for funnel view
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS pipeline_stage text DEFAULT 'novo_negocio';

-- Create index for better performance on pipeline queries
CREATE INDEX IF NOT EXISTS idx_empresas_pipeline_stage ON public.empresas(pipeline_stage);

-- Update existing records based on current status
UPDATE public.empresas 
SET pipeline_stage = CASE 
  WHEN status = 'prospect' THEN 'novo_negocio'
  WHEN status = 'ativo' THEN 'processo_andamento'
  WHEN status = 'inativo' THEN 'processo_finalizado'
  ELSE 'novo_negocio'
END
WHERE pipeline_stage IS NULL OR pipeline_stage = 'novo_negocio';