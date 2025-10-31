-- Add new columns to vagas table
ALTER TABLE vagas
  ADD COLUMN IF NOT EXISTS salario_modalidade text 
    CHECK (salario_modalidade IN ('FAIXA', 'A_COMBINAR')) DEFAULT 'FAIXA',
  ADD COLUMN IF NOT EXISTS beneficios_outros text,
  ADD COLUMN IF NOT EXISTS source text 
    CHECK (source IN ('interno', 'externo')) DEFAULT 'interno';

-- Create notifications table
CREATE TABLE IF NOT EXISTS notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  vaga_id uuid REFERENCES vagas(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  lida boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read notifications
CREATE POLICY "Authenticated users can view notifications"
  ON notificacoes FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to update notifications (mark as read)
CREATE POLICY "Authenticated users can update notifications"
  ON notificacoes FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Create function to notify when external job is created
CREATE OR REPLACE FUNCTION notifica_vaga_externa()
RETURNS trigger AS $$
BEGIN
  IF NEW.source = 'externo' THEN
    INSERT INTO notificacoes (tipo, vaga_id, titulo, mensagem)
    VALUES (
      'vaga_externa',
      NEW.id,
      'Vaga criada via formulário externo',
      'Complete os campos de Recrutamento (Recrutador, CS Responsável, Complexidade, Prioridade).'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for external job notifications
DROP TRIGGER IF EXISTS trg_notifica_vaga_externa ON vagas;
CREATE TRIGGER trg_notifica_vaga_externa
  AFTER INSERT ON vagas
  FOR EACH ROW
  EXECUTE FUNCTION notifica_vaga_externa();