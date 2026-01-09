-- Add endereco_empresa column to vagas table
ALTER TABLE public.vagas ADD COLUMN IF NOT EXISTS endereco_empresa TEXT;