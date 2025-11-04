-- Fix storage buckets: make them private
UPDATE storage.buckets 
SET public = false 
WHERE name IN ('curriculos', 'portfolios');

-- Add RLS policies for storage access (restricted to authorized roles)
CREATE POLICY "storage_curriculos_select"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'curriculos'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'recrutador'::app_role)
  )
);

CREATE POLICY "storage_portfolios_select"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'portfolios'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'recrutador'::app_role)
  )
);

CREATE POLICY "storage_curriculos_insert"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'curriculos'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'recrutador'::app_role)
  )
);

CREATE POLICY "storage_portfolios_insert"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'portfolios'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'recrutador'::app_role)
  )
);

-- Fix historico_candidatos: restrict to authorized roles
DROP POLICY IF EXISTS "Permitir leitura de histórico para usuários autenticados" ON historico_candidatos;
DROP POLICY IF EXISTS "Permitir inserção de histórico para usuários autenticados" ON historico_candidatos;
DROP POLICY IF EXISTS "Permitir atualização de histórico para usuários autenticado" ON historico_candidatos;
DROP POLICY IF EXISTS "Permitir exclusão de histórico para usuários autenticados" ON historico_candidatos;

CREATE POLICY "historico_select_restricted"
ON public.historico_candidatos
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'recrutador'::app_role)
);

CREATE POLICY "historico_insert_restricted"
ON public.historico_candidatos
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'recrutador'::app_role)
);

CREATE POLICY "historico_update_delete_admin"
ON public.historico_candidatos
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix candidatos: restrict to authorized roles
DROP POLICY IF EXISTS "Permitir leitura de candidatos para usuários autenticados" ON candidatos;
DROP POLICY IF EXISTS "Permitir inserção de candidatos para usuários autenticados" ON candidatos;
DROP POLICY IF EXISTS "Permitir atualização de candidatos para usuários autenticado" ON candidatos;
DROP POLICY IF EXISTS "Permitir exclusão de candidatos para usuários autenticados" ON candidatos;

CREATE POLICY "candidatos_select_restricted"
ON public.candidatos
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'recrutador'::app_role)
);

CREATE POLICY "candidatos_insert_restricted"
ON public.candidatos
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'recrutador'::app_role)
);

CREATE POLICY "candidatos_update_restricted"
ON public.candidatos
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'recrutador'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'recrutador'::app_role)
);

CREATE POLICY "candidatos_delete_admin"
ON public.candidatos
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix feedbacks: restrict to authorized roles and authors
DROP POLICY IF EXISTS "Usuários autenticados podem ver feedbacks" ON feedbacks;
DROP POLICY IF EXISTS "Usuários autenticados podem criar feedbacks" ON feedbacks;
DROP POLICY IF EXISTS "Autores podem atualizar seus feedbacks" ON feedbacks;
DROP POLICY IF EXISTS "Autores podem deletar seus feedbacks" ON feedbacks;

CREATE POLICY "feedbacks_select_restricted"
ON public.feedbacks
FOR SELECT
USING (
  auth.uid() = author_user_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'recrutador'::app_role)
);

CREATE POLICY "feedbacks_insert_restricted"
ON public.feedbacks
FOR INSERT
WITH CHECK (
  auth.uid() = author_user_id
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'recrutador'::app_role)
  )
);

CREATE POLICY "feedbacks_update_author"
ON public.feedbacks
FOR UPDATE
USING (auth.uid() = author_user_id)
WITH CHECK (auth.uid() = author_user_id);

CREATE POLICY "feedbacks_delete_author_or_admin"
ON public.feedbacks
FOR DELETE
USING (
  auth.uid() = author_user_id
  OR has_role(auth.uid(), 'admin'::app_role)
);