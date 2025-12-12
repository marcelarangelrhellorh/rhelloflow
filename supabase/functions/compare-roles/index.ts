import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Roles catalog matching frontend src/data/roles_catalog.json
const rolesCatalog = [
  {
    "role_id": "assistente_operacoes",
    "title": "Assistente de Operações",
    "category": "Operações",
    "seniority": "Júnior",
    "core_focus": ["Execução de rotinas", "Suporte operacional"],
    "main_responsibilities": ["Executar tarefas operacionais do dia a dia", "Atualizar sistemas e planilhas", "Apoiar processos de expedição/recebimento"],
    "key_skills": ["organização", "atenção a detalhes", "uso de ferramentas básicas (Excel, CRM)"],
    "typical_metrics": ["Tempo de execução de tarefas", "Erros por operação"],
    "typical_team_size": "1-5",
    "project_scope": "Tarefas recorrentes",
    "when_to_choose": "Quando há necessidade de executar operações diárias e rotinas administrativas", 
    "risks": "Baixa autonomia estratégica; requer supervisão constante"
  },
  {
    "role_id": "analista_operacoes",
    "title": "Analista de Operações",
    "category": "Operações",
    "seniority": "Pleno",
    "core_focus": ["Monitoramento operacional", "Análise de dados"],
    "main_responsibilities": ["Coletar e analisar dados operacionais", "Criar relatórios e dashboards", "Propor melhorias de processo"],
    "key_skills": ["análise de dados", "SQL básico", "process mapping"],
    "typical_metrics": ["OTIF", "Tempo de ciclo", "Taxa de retrabalho"],
    "typical_team_size": "1-8",
    "project_scope": "Operacional contínuo",
    "when_to_choose": "Quando precisa de alguém para transformar dados em ações de melhoria", 
    "risks": "Pode focar demais em indicadores sem priorizar ações de impacto"
  },
  {
    "role_id": "coordenador_operacoes",
    "title": "Coordenador de Operações",
    "category": "Operações",
    "seniority": "Pleno/Sênior",
    "core_focus": ["Execução de equipe", "Garantia de processos"],
    "main_responsibilities": ["Liderar equipes operacionais", "Distribuir demandas e acompanhar produtividade", "Garantir aderência a SLAs"],
    "key_skills": ["liderança", "gestão de indicadores", "comunicação"],
    "typical_metrics": ["Produtividade por agente", "Cumprimento de SLA"],
    "typical_team_size": "5-30",
    "project_scope": "Operacional contínuo",
    "when_to_choose": "Quando houver vários operadores a serem gerenciados e necessidade de coordenação diária", 
    "risks": "Pode ficar sobrecarregado com atividades táticas se não tiver processos claros"
  },
  {
    "role_id": "gerente_operacoes",
    "title": "Gerente de Operações",
    "category": "Operações",
    "seniority": "Sênior",
    "core_focus": ["Eficiência", "Qualidade operacional", "Custos"],
    "main_responsibilities": ["Gerir operações do dia a dia", "Otimizar processos e controlar custos", "Definir e acompanhar KPIs"],
    "key_skills": ["gestão de processos", "melhoria contínua", "análise financeira básica"],
    "typical_metrics": ["Custo por unidade", "Tempo de ciclo", "OTIF"],
    "typical_team_size": "10-100",
    "project_scope": "Contínuo/operacional",
    "when_to_choose": "Quando alvo é eficiência e escala operacional sustentada", 
    "risks": "Foco em manutenção de rotina em detrimento de mudanças rápidas"
  },
  {
    "role_id": "head_operacoes",
    "title": "Head / Diretor de Operações (COO)",
    "category": "Operações",
    "seniority": "Executivo",
    "core_focus": ["Estratégia operacional", "Alinhamento executivo"],
    "main_responsibilities": ["Definir estratégia operacional", "Alinhar operações com metas financeiras e comerciais", "Governança de processos"],
    "key_skills": ["visão estratégica", "gestão de mudanças", "negociação"],
    "typical_metrics": ["EBITDA operacional", "Eficiência operacional global"],
    "typical_team_size": "50+",
    "project_scope": "Estratégico/contínuo",
    "when_to_choose": "Quando a operação impacta diretamente o resultado e precisa de liderança estratégica", 
    "risks": "Pode ficar distante da execução diária se não estruturar camadas de gestão"
  },
  {
    "role_id": "analista_processos",
    "title": "Analista de Processos",
    "category": "Projetos e Processos",
    "seniority": "Pleno",
    "core_focus": ["Mapeamento de processos", "Melhoria contínua"],
    "main_responsibilities": ["Mapear processos AS-IS e desenhar TO-BE", "Elaborar SOPs e instruções de trabalho", "Apoiar projetos de automação"],
    "key_skills": ["BPMN", "documentação", "ferramentas de mapeamento"],
    "typical_metrics": ["Lead time de processo", "Número de processos padronizados"],
    "typical_team_size": "1-5",
    "project_scope": "Projetos de melhoria",
    "when_to_choose": "Quando é necessária padronização e documentação de processos", 
    "risks": "Pode propor burocracia excessiva sem ganhos reais"
  },
  {
    "role_id": "gerente_processos",
    "title": "Gerente de Processos",
    "category": "Projetos e Processos",
    "seniority": "Sênior",
    "core_focus": ["Padronização", "Automação"],
    "main_responsibilities": ["Definir políticas de processos", "Priorizar iniciativas de eficiência", "Implementar automação e RPA"],
    "key_skills": ["lean six sigma", "gestão de projetos", "stakeholder management"],
    "typical_metrics": ["Redução de custo", "SLA de processo"],
    "typical_team_size": "3-20",
    "project_scope": "Programas de melhoria contínua",
    "when_to_choose": "Quando há necessidade de transformar processos em vantagem competitiva", 
    "risks": "Iniciativas mal priorizadas podem consumir recursos sem retorno"
  },
  {
    "role_id": "product_manager",
    "title": "Product Manager (Gerente de Produto)",
    "category": "Produto e Tecnologia",
    "seniority": "Pleno/Sênior",
    "core_focus": ["Visão de produto", "Valor ao usuário"],
    "main_responsibilities": ["Definir roadmap e estratégia de produto", "Priorizar backlog por valor de negócio", "Entender mercado e usuários"],
    "key_skills": ["estratégia de produto", "user research", "priorização"],
    "typical_metrics": ["DAU/MAU", "Retenção", "Revenue impact"],
    "typical_team_size": "1-10 (cross-functional)",
    "project_scope": "Produto contínuo",
    "when_to_choose": "Quando precisa de alguém para definir o que construir e por quê", 
    "risks": "Pode ficar distante da execução técnica sem um PO tático"
  },
  {
    "role_id": "product_owner",
    "title": "Product Owner",
    "category": "Produto e Tecnologia",
    "seniority": "Pleno",
    "core_focus": ["Backlog tático", "Alinhamento com o time"],
    "main_responsibilities": ["Priorizar histórias de usuário", "Detalhar requisitos para o time", "Aceitar entregas"],
    "key_skills": ["escrita de user stories", "priorização tática", "comunicação com engenharia"],
    "typical_metrics": ["Throughput de entregas", "Velocidade"],
    "typical_team_size": "1-8 (squad)",
    "project_scope": "Sprint-to-sprint / iterativo",
    "when_to_choose": "Quando o foco é tradução das necessidades do negócio para o squad", 
    "risks": "Pode priorizar curto prazo sem visão estratégica se não estiver alinhado com PM"
  },
  {
    "role_id": "tech_lead",
    "title": "Tech Lead / Líder Técnico",
    "category": "Tecnologia",
    "seniority": "Sênior",
    "core_focus": ["Decisões técnicas", "Qualidade de código"],
    "main_responsibilities": ["Definir arquitetura de referência", "Mentorar desenvolvedores", "Revisar código crítico"],
    "key_skills": ["arquitetura", "code review", "mentoria"],
    "typical_metrics": ["Tempo médio de entrega técnica", "Defeitos em produção"],
    "typical_team_size": "3-12",
    "project_scope": "Técnico / contínuo",
    "when_to_choose": "Quando a tomada de decisão técnica centralizada é necessária", 
    "risks": "Risco de centralização excessiva se o Tech Lead não delegar"
  },
  {
    "role_id": "cto",
    "title": "Chief Technology Officer (CTO)",
    "category": "Tecnologia",
    "seniority": "Executivo",
    "core_focus": ["Estratégia tecnológica", "Escalabilidade"],
    "main_responsibilities": ["Definir visão e stack tecnológica", "Planejar capacidade e segurança", "Liderar equipe de engenharia"],
    "key_skills": ["estratégia de TI", "liderança executiva", "governança de tecnologia"],
    "typical_metrics": ["Uptime", "Time-to-market", "Custo de infraestrutura"],
    "typical_team_size": "20+",
    "project_scope": "Estratégico / longo prazo",
    "when_to_choose": "Quando a tecnologia é diferencial estratégico e precisa de liderança sênior", 
    "risks": "Foco estratégico pode perder atenção em demandas táticas se a liderança estiver desconectada"
  },
  {
    "role_id": "engenheiro_software_junior",
    "title": "Engenheiro de Software (Júnior)",
    "category": "Tecnologia",
    "seniority": "Júnior",
    "core_focus": ["Implementação básica", "Aprendizado"],
    "main_responsibilities": ["Desenvolver funcionalidades sob supervisão", "Corrigir bugs simples", "Escrever testes básicos"],
    "key_skills": ["linguagem específica", "git", "práticas de teste"],
    "typical_metrics": ["Commits por sprint", "Bugs resolvidos"],
    "typical_team_size": "1-6",
    "project_scope": "Tarefas técnicas específicas",
    "when_to_choose": "Quando há backlog técnico com tarefas bem definidas e necessidade de capacidade de execução", 
    "risks": "Requer supervisão e tempo para ramp-up"
  },
  {
    "role_id": "engenheiro_software_pleno",
    "title": "Engenheiro de Software (Pleno)",
    "category": "Tecnologia",
    "seniority": "Pleno",
    "core_focus": ["Entrega de funcionalidades", "Qualidade de código"],
    "main_responsibilities": ["Desenvolver features com autonomia", "Colaborar na arquitetura", "Participar de code review"],
    "key_skills": ["design de software", "testes automatizados", "debugging"],
    "typical_metrics": ["Throughput", "Coverage de testes"],
    "typical_team_size": "1-8",
    "project_scope": "Funcionalidades e manutenção",
    "when_to_choose": "Quando precisa de desenvolvedores com autonomia técnica", 
    "risks": "Pode precisar de apoio em decisões arquiteturais complexas"
  },
  {
    "role_id": "engenheiro_software_senior",
    "title": "Engenheiro de Software (Sênior)",
    "category": "Tecnologia",
    "seniority": "Sênior",
    "core_focus": ["Arquitetura", "Mentoria"],
    "main_responsibilities": ["Projetar soluções escaláveis", "Orientar equipe técnica", "Resolver problemas complexos"],
    "key_skills": ["arquitetura de software", "performance tuning", "liderança técnica"],
    "typical_metrics": ["Impacto em arquitetura", "Incidentes resolvidos"],
    "typical_team_size": "1-12",
    "project_scope": "Sistemas críticos",
    "when_to_choose": "Quando há desafios técnicos complexos ou necessidade de liderar iniciativas críticas", 
    "risks": "Custo salarial mais alto; disponível para hands-on pode ser limitado"
  },
  {
    "role_id": "devops_sre",
    "title": "DevOps / SRE",
    "category": "Tecnologia",
    "seniority": "Pleno/Sênior",
    "core_focus": ["Infraestrutura", "Disponibilidade"],
    "main_responsibilities": ["Automatizar CI/CD", "Monitorar sistemas", "Gerenciar custos de cloud"],
    "key_skills": ["cloud (AWS/GCP/Azure)", "observability", "infra as code"],
    "typical_metrics": ["MTTR", "Uptime", "Deployment frequency"],
    "typical_team_size": "1-8",
    "project_scope": "Infraestrutura contínua",
    "when_to_choose": "Quando a disponibilidade e automação de infraestrutura são críticas", 
    "risks": "Pode ser difícil localizar profissionais com experiência ampla"
  },
  {
    "role_id": "qa_analista",
    "title": "QA / Analista de Testes",
    "category": "Tecnologia",
    "seniority": "Pleno",
    "core_focus": ["Qualidade de software", "Testes"],
    "main_responsibilities": ["Criar e executar planos de teste", "Automatizar testes", "Reportar defeitos"],
    "key_skills": ["test automation", "test cases", "ferramentas de testing"],
    "typical_metrics": ["Defeitos encontrados em produção", "Cobertura de testes"],
    "typical_team_size": "1-6",
    "project_scope": "Qualidade contínua",
    "when_to_choose": "Quando é necessário garantir padrões de qualidade antes de releases", 
    "risks": "Testes insuficientes podem levar a bugs em produção"
  },
  {
    "role_id": "ux_ui_designer",
    "title": "UX/UI Designer",
    "category": "Design & Conteúdo",
    "seniority": "Pleno",
    "core_focus": ["Usabilidade", "Interface"],
    "main_responsibilities": ["Pesquisa com usuários", "Prototipação", "Design de telas e fluxos"],
    "key_skills": ["user research", "prototyping", "ferramentas de design"],
    "typical_metrics": ["Task success rate", "Tempo até primeira ação"],
    "typical_team_size": "1-6",
    "project_scope": "Produto/experiência",
    "when_to_choose": "Quando a experiência do usuário precisa ser melhorada ou criada", 
    "risks": "Soluções puramente estéticas sem validação podem falhar"
  },
  {
    "role_id": "motion_designer",
    "title": "Motion Designer",
    "category": "Design & Conteúdo",
    "seniority": "Pleno",
    "core_focus": ["Animação", "Vídeo"],
    "main_responsibilities": ["Criar animações e vídeos para produto e marketing", "Trabalhar com assets visuais"],
    "key_skills": ["after effects", "edição de vídeo", "storytelling visual"],
    "typical_metrics": ["Engajamento de conteúdo", "Conversões por vídeo"],
    "typical_team_size": "1-4",
    "project_scope": "Projetos criativos",
    "when_to_choose": "Quando há necessidade de conteúdo animado para comunicação ou produto", 
    "risks": "Produção pode ser mais demorada e custosa"
  },
  {
    "role_id": "designer_grafico",
    "title": "Designer Gráfico",
    "category": "Design & Conteúdo",
    "seniority": "Júnior/Pleno",
    "core_focus": ["Criação visual", "Marca"],
    "main_responsibilities": ["Criar materiais gráficos", "Apoiar campanhas de marketing"],
    "key_skills": ["photoshop/illustrator", "tipografia", "composição visual"],
    "typical_metrics": ["Tempo de entrega", "Qualidade visual"],
    "typical_team_size": "1-6",
    "project_scope": "Criação contínua",
    "when_to_choose": "Para demandas regulares de criação visual", 
    "risks": "Pode haver desalinhamento com estratégia de marca sem direcionamento claro"
  },
  {
    "role_id": "redator_copywriter",
    "title": "Redator / Copywriter",
    "category": "Design & Conteúdo",
    "seniority": "Pleno",
    "core_focus": ["Mensagens", "Persuasão"],
    "main_responsibilities": ["Escrever textos para campanhas, site e materiais", "Ajustar tom de voz"],
    "key_skills": ["copywriting", "SEO básico", "storytelling"],
    "typical_metrics": ["CTR", "Taxa de conversão"],
    "typical_team_size": "1-4",
    "project_scope": "Conteúdo e comunicação",
    "when_to_choose": "Quando precisa de textos com objetivo de conversão ou comunicação clara", 
    "risks": "Textos desalinhados podem prejudicar a marca"
  },
  {
    "role_id": "social_media",
    "title": "Social Media",
    "category": "Marketing",
    "seniority": "Júnior/Pleno",
    "core_focus": ["Engajamento", "Comunidade"],
    "main_responsibilities": ["Gerenciar perfis", "Produzir conteúdo e relatórios de engajamento"],
    "key_skills": ["gestão de redes", "criação de conteúdo", "analytics"],
    "typical_metrics": ["Engajamento", "Crescimento de seguidores"],
    "typical_team_size": "1-4",
    "project_scope": "Marketing contínuo",
    "when_to_choose": "Para presença ativa em redes sociais e gestão de comunidade", 
    "risks": "Resulta variável por algoritmo das plataformas"
  },
  {
    "role_id": "analista_marketing",
    "title": "Analista de Marketing",
    "category": "Marketing",
    "seniority": "Pleno",
    "core_focus": ["Campanhas", "Mensuração"],
    "main_responsibilities": ["Planejar e executar campanhas", "Analisar resultados e otimizar canais"],
    "key_skills": ["analytics", "planejamento de campanhas", "ferramentas de anúncios"],
    "typical_metrics": ["CPA", "CAC", "ROAS"],
    "typical_team_size": "1-8",
    "project_scope": "Campanhas e experimentos",
    "when_to_choose": "Quando precisa de execução e análise de performance de marketing", 
    "risks": "Dependência de budget e sazonalidade"
  },
  {
    "role_id": "especialista_performance",
    "title": "Especialista em Performance (Ads)",
    "category": "Marketing",
    "seniority": "Pleno/Sênior",
    "core_focus": ["Mídia paga", "Otimização de campanhas"],
    "main_responsibilities": ["Gerir campanhas pagas", "Otimizar lances e criativos"],
    "key_skills": ["google ads", "meta ads", "analytics"],
    "typical_metrics": ["CPC", "CPA", "ROAS"],
    "typical_team_size": "1-4",
    "project_scope": "Campanhas pagas",
    "when_to_choose": "Quando há investimento em aquisição paga e necessidade de otimização contínua", 
    "risks": "Performance depende de orçamento e mudanças de plataforma"
  },
  {
    "role_id": "product_marketing_manager",
    "title": "Product Marketing Manager",
    "category": "Marketing",
    "seniority": "Sênior",
    "core_focus": ["Go-to-market", "Posicionamento"],
    "main_responsibilities": ["Desenvolver posicionamento do produto", "Lançamentos e enablement"],
    "key_skills": ["go-to-market", "mensuração de lançamento", "evangelismo de produto"],
    "typical_metrics": ["Adoção pós-lançamento", "Conversão por campanha"],
    "typical_team_size": "1-6",
    "project_scope": "Lançamentos e posicionamento",
    "when_to_choose": "Para alavancar lançamentos e alinhar produto com mercado", 
    "risks": "Lançamentos mal executados não geram tração"
  },
  {
    "role_id": "sdr_bdr",
    "title": "SDR / BDR (Pré-vendas)",
    "category": "Comercial",
    "seniority": "Júnior/Pleno",
    "core_focus": ["Qualificação de leads", "Agendamento"],
    "main_responsibilities": ["Prospectar e qualificar leads", "Agendar reuniões para vendas"],
    "key_skills": ["comunicação", "ferramentas de cadências (CRM)", "qualificação"],
    "typical_metrics": ["Leads qualificados", "Taxa de conversão para demo"],
    "typical_team_size": "2-10",
    "project_scope": "Geração de pipeline",
    "when_to_choose": "Quando precisa alimentar o time de vendas com oportunidades qualificadas", 
    "risks": "Baixa qualificação gera frustração no time de fechamento"
  },
  {
    "role_id": "executivo_vendas",
    "title": "Executivo de Vendas",
    "category": "Comercial",
    "seniority": "Pleno/Sênior",
    "core_focus": ["Fechamento de negócios", "Negociação"],
    "main_responsibilities": ["Fechar contratos e metas de receita", "Gerenciar pipeline e forecast"],
    "key_skills": ["negociação", "forecasting", "relações comerciais"],
    "typical_metrics": ["Quota atingida", "Ticket médio"],
    "typical_team_size": "1-8",
    "project_scope": "Vendas por ciclo comercial",
    "when_to_choose": "Quando há necessidade de conversão e receita imediata", 
    "risks": "Foco em curto prazo pode prejudicar relacionamento de longo prazo"
  },
  {
    "role_id": "kam_gerente_contas",
    "title": "Gerente de Contas / KAM",
    "category": "Comercial",
    "seniority": "Sênior",
    "core_focus": ["Gestão de contas", "Expansão de receita"],
    "main_responsibilities": ["Manter relacionamento com clientes estratégicos", "Identificar oportunidades de upsell e cross-sell"],
    "key_skills": ["customer relationship", "negociação estratégica", "planejamento de contas"],
    "typical_metrics": ["Renewal rate", "Expansion revenue"],
    "typical_team_size": "1-5",
    "project_scope": "Gestão de carteira",
    "when_to_choose": "Para clientes estratégicos com potencial de expansão", 
    "risks": "Dependência de relacionamentos individuais"
  },
  {
    "role_id": "coordenador_comercial",
    "title": "Coordenador Comercial",
    "category": "Comercial",
    "seniority": "Pleno",
    "core_focus": ["Operação de vendas", "Processos comerciais"],
    "main_responsibilities": ["Coordenar time de vendas", "Acompanhar metas e indicadores"],
    "key_skills": ["gestão de pessoas", "processos comerciais", "CRM"],
    "typical_metrics": ["Taxa de conversão do time", "Atendimento de meta"],
    "typical_team_size": "5-30",
    "project_scope": "Operação comercial",
    "when_to_choose": "Para estruturar operação e alinhar processos de vendas", 
    "risks": "Pode se tornar um gargalo se responsabilidades não forem bem distribuídas"
  },
  {
    "role_id": "gerente_comercial",
    "title": "Gerente Comercial",
    "category": "Comercial",
    "seniority": "Sênior",
    "core_focus": ["Estratégia de vendas", "Resultados"],
    "main_responsibilities": ["Definir metas e estratégia comercial", "Gerenciar canais e equipe"],
    "key_skills": ["planejamento estratégico", "gestão de equipes", "analítica de vendas"],
    "typical_metrics": ["Receita", "Crescimento de vendas"],
    "typical_team_size": "10-100",
    "project_scope": "Estratégico-operacional",
    "when_to_choose": "Quando precisa escalar vendas com estratégia clara", 
    "risks": "Pressão por resultados pode levar a foco excessivo em curto prazo"
  },
  {
    "role_id": "analista_financeiro",
    "title": "Analista Financeiro",
    "category": "Financeiro",
    "seniority": "Pleno",
    "core_focus": ["Controle financeiro", "Relatórios"],
    "main_responsibilities": ["Conciliação, fluxo de caixa", "Relatórios gerenciais"],
    "key_skills": ["contabilidade básica", "Excel avançado", "análise financeira"],
    "typical_metrics": ["Fluxo de caixa", "Accuracy de forecast"],
    "typical_team_size": "1-6",
    "project_scope": "Rotina financeira",
    "when_to_choose": "Para manter controles financeiros e previsões confiáveis", 
    "risks": "Erros em previsão podem afetar decisões estratégicas"
  },
  {
    "role_id": "controller",
    "title": "Controller",
    "category": "Financeiro",
    "seniority": "Sênior",
    "core_focus": ["Governança financeira", "Reporting"],
    "main_responsibilities": ["Planejamento financeiro", "Controles internos", "Relatórios para diretoria"],
    "key_skills": ["contabilidade gerencial", "governança", "modelagem financeira"],
    "typical_metrics": ["Forecast accuracy", "Budget variance"],
    "typical_team_size": "3-20",
    "project_scope": "Estratégico-operacional",
    "when_to_choose": "Quando a empresa precisa de controles financeiros robustos", 
    "risks": "Excesso de controle pode reduzir agilidade"
  },
  {
    "role_id": "gerente_financeiro",
    "title": "Gerente Financeiro",
    "category": "Financeiro",
    "seniority": "Sênior",
    "core_focus": ["Gestão de caixa", "Estratégia financeira"],
    "main_responsibilities": ["Gerenciar fluxo de caixa", "Planejar orçamento e investimentos"],
    "key_skills": ["planejamento financeiro", "gestão de riscos", "liderança"],
    "typical_metrics": ["Cash runway", "EBITDA"],
    "typical_team_size": "5-30",
    "project_scope": "Contínuo/estratégico",
    "when_to_choose": "Quando há necessidade de governança financeira e visão estratégica", 
    "risks": "Decisões financeiras impopulares podem gerar resistência"
  },
  {
    "role_id": "diretor_financeiro",
    "title": "Diretor Financeiro (CFO)",
    "category": "Financeiro",
    "seniority": "Executivo",
    "core_focus": ["Estratégia de capital", "Relação com investidores"],
    "main_responsibilities": ["Definir estratégia financeira de longo prazo", "Relacionamento com investidores e bancos"],
    "key_skills": ["finanças corporativas", "captação", "governança"],
    "typical_metrics": ["Retorno sobre capital", "Crescimento sustentável"],
    "typical_team_size": "10+",
    "project_scope": "Estratégico",
    "when_to_choose": "Para liderança financeira em empresas em escala ou em busca de capital", 
    "risks": "Foco em métricas financeiras pode desalinhar iniciativas operacionais se não houver equilíbrio"
  }
];

// Generate cache key from inputs
function generateCacheKey(userId: string, roleIds: string[], requirements: Record<string, number>): string {
  const sortedRoles = [...roleIds].sort();
  const sortedReqs = Object.keys(requirements).sort().map(k => `${k}:${requirements[k]}`).join('|');
  const data = `${userId}|${sortedRoles.join(',')}|${sortedReqs}`;
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `role_cmp_${Math.abs(hash).toString(16)}`;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth header for user identification
    const authHeader = req.headers.get('Authorization');
    let userId = 'anonymous';
    
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (user) userId = user.id;
    }

    const { roleIds, requirements, clientContext, forceRefresh, action } = await req.json();

    // Handle save action
    if (action === 'save') {
      const { error } = await supabase
        .from('saved_role_comparisons')
        .insert({
          user_id: userId,
          role_ids: roleIds,
          requirements,
          client_context: clientContext,
          prompt_version: 'v1.0'
        });
      
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle list saved comparisons
    if (action === 'list_saved') {
      const { data, error } = await supabase
        .from('saved_role_comparisons')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return new Response(JSON.stringify({ comparisons: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate role selection (2-5 roles)
    if (!roleIds || roleIds.length < 2 || roleIds.length > 5) {
      return new Response(
        JSON.stringify({ error: 'Selecione entre 2 e 5 cargos para comparar' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate cache key
    const cacheKey = generateCacheKey(userId, roleIds, requirements || {});

    // Check cache if not forcing refresh
    if (!forceRefresh) {
      // First, cleanup expired cache entries
      await supabase.rpc('cleanup_role_comparison_cache');

      const { data: cachedResult } = await supabase
        .from('role_comparison_cache')
        .select('result')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (cachedResult) {
        console.log('Cache hit for key:', cacheKey);
        return new Response(JSON.stringify(cachedResult.result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    console.log('Cache miss, calling AI for key:', cacheKey);

    // Get selected roles from catalog
    const selectedRoles = rolesCatalog.filter(r => roleIds.includes(r.role_id));

    if (selectedRoles.length === 0) {
      console.log('No roles found. Requested IDs:', roleIds);
      console.log('Available IDs:', rolesCatalog.map(r => r.role_id));
      return new Response(
        JSON.stringify({ error: 'Nenhum cargo encontrado com os IDs fornecidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build AI prompt
    const systemPrompt = `Você é um assistente especializado em recrutamento e seleção.
Sua função é comparar cargos e recomendar o cargo ideal com base no escopo dos cargos selecionados e nas prioridades do cliente.

Você recebe:
1) O escopo completo de cada cargo (dados do banco)
2) Os requisitos e pesos do cliente (1-5, onde 5 é mais importante)
3) Contexto opcional do cliente

Você deve produzir EXATAMENTE estas seções em JSON:
- summary: Resumo executivo (2-3 frases) com a recomendação clara do cargo ideal
- table_markdown: Tabela comparativa em Markdown. FORMATO OBRIGATÓRIO:
  * Use EXATAMENTE estas 5 colunas: Cargo | Foco | Nível | Indicado Para | Fit
  * Cada célula deve ter NO MÁXIMO 25 caracteres
  * Use abreviações quando necessário (ex: "Estratégia" em vez de "Estratégia operacional")
  * CADA LINHA DEVE ESTAR EM UMA NOVA LINHA SEPARADA
  * A coluna "Fit" deve conter apenas um número de 1 a 5
  * Exemplo de formato:
| Cargo | Foco | Nível | Indicado Para | Fit |
|-------|------|-------|---------------|-----|
| PM | Visão produto | Sênior | Definir roadmap | 4 |
| PO | Backlog tático | Pleno | Priorizar sprints | 3 |
- detailed_justification: 3-5 parágrafos explicando vantagens, riscos e trade-offs de cada cargo
- recommended_role: ID do cargo mais adequado (ex: "product_manager")
- suggested_job_title: Título sugerido para a vaga em português
- short_briefing: Array de exatamente 3 bullets com briefing da posição recomendada

Responda APENAS em JSON válido, sem markdown code blocks.`;

    const userPrompt = `## Cargos selecionados para comparação:
${selectedRoles.map(r => `
### ${r.title} (${r.role_id})
- Categoria: ${r.category}
- Senioridade: ${r.seniority}
- Foco Principal: ${r.core_focus.join(', ')}
- Responsabilidades: ${r.main_responsibilities.join('; ')}
- Skills: ${r.key_skills.join(', ')}
- Métricas típicas: ${r.typical_metrics.join(', ')}
- Tamanho típico de time: ${r.typical_team_size}
- Escopo: ${r.project_scope}
- Quando escolher: ${r.when_to_choose}
- Riscos: ${r.risks}
`).join('\n')}

## Requisitos do cliente (peso 1-5):
${Object.entries(requirements || {}).map(([k, v]) => `- ${k}: ${v}/5`).join('\n')}

## Contexto adicional do cliente:
${clientContext || 'Nenhum contexto adicional fornecido.'}

Por favor, analise os cargos acima e produza a comparação conforme o formato especificado.`;

    // Call Lovable AI
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 3000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Erro ao processar comparação com IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    let resultText = aiData.choices?.[0]?.message?.content || '';
    
    // Clean up response - remove markdown code blocks if present
    resultText = resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let result;
    try {
      result = JSON.parse(resultText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', resultText);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar resposta da IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enrich result with role details
    result.selected_roles = selectedRoles.map(r => ({
      role_id: r.role_id,
      title_pt: r.title,
      category: r.category,
      seniority_levels: [r.seniority],
      demand_trend: 'N/A'
    }));

    // Save to cache
    await supabase
      .from('role_comparison_cache')
      .upsert({
        cache_key: cacheKey,
        result,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
      }, {
        onConflict: 'cache_key'
      });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Error in compare-roles function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
