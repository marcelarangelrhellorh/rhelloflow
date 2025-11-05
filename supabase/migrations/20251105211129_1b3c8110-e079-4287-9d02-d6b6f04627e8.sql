-- Add origem field to candidatos table
ALTER TABLE public.candidatos 
ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.candidatos.origem IS 'Source/origin of the candidate (e.g., Link de Divulgação, Pandapé, LinkedIn, Gupy)';