-- Remover políticas antigas de visualização de candidatos se existirem
DROP POLICY IF EXISTS "Clientes podem ver candidatos de suas vagas" ON candidatos;
DROP POLICY IF EXISTS "Usuários internos podem ver todos os candidatos" ON candidatos;
DROP POLICY IF EXISTS "candidatos_select_authenticated" ON candidatos;

-- Criar política para clientes verem apenas candidatos em Shortlist de suas vagas
CREATE POLICY "Clientes podem ver candidatos Shortlist de suas vagas"
ON candidatos
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'client'::app_role) 
  AND vaga_relacionada_id IN (
    SELECT v.id 
    FROM vagas v
    INNER JOIN profiles p ON p.empresa_id = v.empresa_id
    WHERE p.id = auth.uid()
  )
  AND status = 'Shortlist'
  AND deleted_at IS NULL
);

-- Criar política para usuários internos verem todos os candidatos
CREATE POLICY "Usuários internos podem ver todos os candidatos"
ON candidatos
FOR SELECT
TO authenticated
USING (
  (has_role(auth.uid(), 'admin'::app_role) 
   OR has_role(auth.uid(), 'recrutador'::app_role) 
   OR has_role(auth.uid(), 'cs'::app_role))
  AND deleted_at IS NULL
);

-- Comentário explicativo
COMMENT ON POLICY "Clientes podem ver candidatos Shortlist de suas vagas" ON candidatos IS 
'Clientes só podem visualizar candidatos que estão na etapa Shortlist e pertencem a vagas da empresa do cliente';