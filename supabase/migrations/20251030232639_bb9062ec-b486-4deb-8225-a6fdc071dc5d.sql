-- Criar tipos enumerados
CREATE TYPE public.complexidade_vaga AS ENUM ('Baixa', 'Média', 'Alta', 'Muito Alta');
CREATE TYPE public.prioridade_vaga AS ENUM ('Baixa', 'Normal', 'Alta', 'Crítica');
CREATE TYPE public.status_vaga AS ENUM (
  'A iniciar',
  'Discovery', 
  'Triagem',
  'Entrevistas Rhello',
  'Aguardando retorno do cliente',
  'Apresentação de Candidatos',
  'Entrevista cliente',
  'Em processo de contratação',
  'Concluído',
  'Cancelada'
);
CREATE TYPE public.modelo_trabalho AS ENUM ('Presencial', 'Híbrido', 'Remoto');
CREATE TYPE public.nivel_candidato AS ENUM ('Estagiário', 'Júnior', 'Pleno', 'Sênior', 'Liderança');
CREATE TYPE public.area_candidato AS ENUM ('RH', 'Vendas', 'Financeiro', 'Marketing', 'Operações', 'TI', 'Administrativo', 'Comercial', 'Logística', 'Outros');
CREATE TYPE public.status_candidato AS ENUM (
  'Banco de Talentos',
  'Triado para a vaga',
  'Entrevista rhello',
  'Reprovado rhello',
  'Aprovado rhello',
  'Entrevistas Solicitante',
  'Reprovado Solicitante',
  'Aprovado Solicitante',
  'Contratado'
);
CREATE TYPE public.resultado_historico AS ENUM ('Aprovado', 'Reprovado', 'Contratado', 'Em andamento');

-- Tabela de vagas
CREATE TABLE public.vagas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  empresa TEXT NOT NULL,
  confidencial BOOLEAN DEFAULT false,
  motivo_confidencial TEXT,
  recrutador TEXT,
  cs_responsavel TEXT,
  complexidade public.complexidade_vaga DEFAULT 'Média',
  prioridade public.prioridade_vaga DEFAULT 'Normal',
  status public.status_vaga DEFAULT 'A iniciar',
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  salario_min NUMERIC,
  salario_max NUMERIC,
  modelo_trabalho public.modelo_trabalho,
  horario_inicio TIME,
  horario_fim TIME,
  dias_semana TEXT[],
  beneficios TEXT[],
  requisitos_obrigatorios TEXT,
  requisitos_desejaveis TEXT,
  responsabilidades TEXT,
  observacoes TEXT
);

-- Tabela de candidatos
CREATE TABLE public.candidatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  cidade TEXT,
  estado TEXT,
  linkedin TEXT,
  curriculo_link TEXT,
  nivel public.nivel_candidato,
  area public.area_candidato,
  pretensao_salarial NUMERIC,
  status public.status_candidato DEFAULT 'Banco de Talentos',
  recrutador TEXT,
  vaga_relacionada_id UUID REFERENCES public.vagas(id) ON DELETE SET NULL,
  feedback TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de histórico de candidatos
CREATE TABLE public.historico_candidatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id UUID REFERENCES public.candidatos(id) ON DELETE CASCADE NOT NULL,
  vaga_id UUID REFERENCES public.vagas(id) ON DELETE CASCADE,
  resultado public.resultado_historico NOT NULL,
  feedback TEXT,
  data TIMESTAMP WITH TIME ZONE DEFAULT now(),
  recrutador TEXT
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.vagas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_candidatos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (público para todos os usuários autenticados - sistema interno)
CREATE POLICY "Permitir leitura de vagas para usuários autenticados"
  ON public.vagas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Permitir inserção de vagas para usuários autenticados"
  ON public.vagas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir atualização de vagas para usuários autenticados"
  ON public.vagas FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Permitir exclusão de vagas para usuários autenticados"
  ON public.vagas FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Permitir leitura de candidatos para usuários autenticados"
  ON public.candidatos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Permitir inserção de candidatos para usuários autenticados"
  ON public.candidatos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir atualização de candidatos para usuários autenticados"
  ON public.candidatos FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Permitir exclusão de candidatos para usuários autenticados"
  ON public.candidatos FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Permitir leitura de histórico para usuários autenticados"
  ON public.historico_candidatos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Permitir inserção de histórico para usuários autenticados"
  ON public.historico_candidatos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Permitir atualização de histórico para usuários autenticados"
  ON public.historico_candidatos FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Permitir exclusão de histórico para usuários autenticados"
  ON public.historico_candidatos FOR DELETE
  TO authenticated
  USING (true);

-- Índices para melhorar performance
CREATE INDEX idx_candidatos_vaga ON public.candidatos(vaga_relacionada_id);
CREATE INDEX idx_candidatos_status ON public.candidatos(status);
CREATE INDEX idx_vagas_status ON public.vagas(status);
CREATE INDEX idx_historico_candidato ON public.historico_candidatos(candidato_id);
CREATE INDEX idx_historico_vaga ON public.historico_candidatos(vaga_id);