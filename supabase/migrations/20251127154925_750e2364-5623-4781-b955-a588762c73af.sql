
-- Corrigir RLS da tabela candidatos para clientes usando empresa_id
DROP POLICY IF EXISTS "Clients can view candidates from their jobs only" ON public.candidatos;

CREATE POLICY "Clients can view candidates from their company jobs"
ON public.candidatos
FOR SELECT
USING (
  has_role(auth.uid(), 'client'::app_role) 
  AND vaga_relacionada_id IN (
    SELECT v.id 
    FROM vagas v
    JOIN profiles p ON p.empresa_id = v.empresa_id
    WHERE p.id = auth.uid() 
    AND v.deleted_at IS NULL
  )
  AND deleted_at IS NULL
);
