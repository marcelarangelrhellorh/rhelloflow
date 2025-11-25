
-- Adicionar política RLS para permitir clientes verem feedback_requests das suas vagas
CREATE POLICY "Clientes podem ver feedback requests de suas vagas"
ON feedback_requests
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'client'::app_role) 
  AND vaga_id IN (
    SELECT v.id 
    FROM vagas v
    JOIN profiles p ON p.empresa_id = v.empresa_id
    WHERE p.id = auth.uid()
  )
);
