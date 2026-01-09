-- job_history: atualizar política DELETE para incluir autor
DROP POLICY IF EXISTS "Admins can delete job history" ON job_history;
CREATE POLICY "Users can delete own or admins any job history"
ON job_history FOR DELETE
USING (
  user_id = auth.uid() 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- empresa_notes: criar política DELETE
CREATE POLICY "Users can delete own or admins any empresa notes"
ON empresa_notes FOR DELETE
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- empresa_notes: criar política UPDATE
CREATE POLICY "Users can update own or admins any empresa notes"
ON empresa_notes FOR UPDATE
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'recrutador'::app_role)
  OR has_role(auth.uid(), 'cs'::app_role)
)
WITH CHECK (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'recrutador'::app_role)
  OR has_role(auth.uid(), 'cs'::app_role)
);

-- candidate_notes: criar política DELETE para autor
CREATE POLICY "Users can delete own candidate notes"
ON candidate_notes FOR DELETE
USING (user_id = auth.uid());