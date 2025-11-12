-- Passo 2: Adicionar cliente_id e RLS policies

-- Garantir que vagas tem cliente_id (caso não tenha)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vagas' AND column_name = 'cliente_id'
  ) THEN
    ALTER TABLE vagas ADD COLUMN cliente_id uuid REFERENCES auth.users(id);
    CREATE INDEX idx_vagas_cliente_id ON vagas(cliente_id);
  END IF;
END $$;

-- RLS policy para clientes verem apenas suas vagas
DROP POLICY IF EXISTS "Clientes podem ver suas próprias vagas" ON vagas;
CREATE POLICY "Clientes podem ver suas próprias vagas"
ON vagas
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'cliente'::app_role) AND cliente_id = auth.uid()
);

-- RLS policy para clientes verem candidatos apenas de suas vagas
DROP POLICY IF EXISTS "Clientes podem ver candidatos de suas vagas" ON candidatos;
CREATE POLICY "Clientes podem ver candidatos de suas vagas"
ON candidatos
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'cliente'::app_role) 
  AND vaga_relacionada_id IN (
    SELECT id FROM vagas WHERE cliente_id = auth.uid()
  )
);

-- RLS policy para clientes verem histórico de suas vagas
DROP POLICY IF EXISTS "Clientes podem ver job stage history de suas vagas" ON job_stage_history;
CREATE POLICY "Clientes podem ver job stage history de suas vagas"
ON job_stage_history
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'cliente'::app_role)
  AND job_id IN (
    SELECT id FROM vagas WHERE cliente_id = auth.uid()
  )
);

COMMENT ON COLUMN vagas.cliente_id IS 'ID do cliente (empresa) que possui esta vaga. Usado para filtrar visualização de clientes externos.';