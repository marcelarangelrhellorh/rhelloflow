import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Roles catalog embedded for Edge Function access
const rolesCatalog = [
  {
    "role_id": "PM_001",
    "title_pt": "Product Manager",
    "title_en": "Product Manager",
    "category": "Produto",
    "seniority_levels": ["Pleno", "Sênior", "Head"],
    "summary_pt": "Responsável pela estratégia e ciclo de vida do produto. Define visão, roadmap e priorização. Interage com stakeholders e equipes de desenvolvimento.",
    "core_responsibilities": [
      "Definir visão de produto e roadmap",
      "Priorizar backlog com base em impacto e esforço",
      "Coletar e analisar feedback de clientes",
      "Trabalhar com UX, engenharia e marketing",
      "Definir métricas de sucesso (OKRs, KPIs)"
    ],
    "key_skills": ["Visão de produto", "Priorização", "Stakeholder management", "Métricas", "User research"],
    "tools_common": ["Jira", "Confluence", "Productboard", "Mixpanel", "Amplitude"],
    "typical_deliverables": ["PRD", "Roadmap", "Release notes", "Análise de métricas"],
    "overlap_roles": ["PO_001", "GPM_001"],
    "differentiation_notes": "PM foca em estratégia e visão de longo prazo, enquanto PO foca em execução e backlog.",
    "market_salary_range_brl": { "pleno": [12000, 18000], "senior": [18000, 28000], "head": [28000, 45000] },
    "demand_trend": "Alta"
  },
  {
    "role_id": "PO_001",
    "title_pt": "Product Owner",
    "title_en": "Product Owner",
    "category": "Produto",
    "seniority_levels": ["Pleno", "Sênior"],
    "summary_pt": "Atua como interface entre negócio e time de desenvolvimento. Responsável pelo backlog, escrita de histórias e aceite de entregas.",
    "core_responsibilities": [
      "Gerenciar e priorizar backlog",
      "Escrever user stories e critérios de aceite",
      "Participar de cerimônias ágeis",
      "Validar entregas com stakeholders",
      "Refinar requisitos com o time"
    ],
    "key_skills": ["Escrita de user stories", "Priorização", "Comunicação", "Agile/Scrum", "Negociação"],
    "tools_common": ["Jira", "Azure DevOps", "Trello", "Notion"],
    "typical_deliverables": ["User stories", "Backlog priorizado", "Aceites de sprint"],
    "overlap_roles": ["PM_001", "BA_001"],
    "differentiation_notes": "PO é mais tático e focado em sprints, enquanto PM é estratégico.",
    "market_salary_range_brl": { "pleno": [10000, 15000], "senior": [15000, 22000] },
    "demand_trend": "Alta"
  },
  {
    "role_id": "GPM_001",
    "title_pt": "Group Product Manager",
    "title_en": "Group Product Manager",
    "category": "Produto",
    "seniority_levels": ["Sênior", "Head"],
    "summary_pt": "Lidera múltiplos PMs ou produtos. Responsável por alinhamento estratégico entre produtos e gestão de portfólio.",
    "core_responsibilities": [
      "Liderar e mentorar PMs",
      "Alinhar roadmaps entre produtos",
      "Definir estratégia de portfólio",
      "Reportar para C-level",
      "Garantir consistência de visão"
    ],
    "key_skills": ["Liderança", "Visão estratégica", "Gestão de portfólio", "Mentoria", "Influência"],
    "tools_common": ["Jira", "Productboard", "Roadmunk", "Tableau"],
    "typical_deliverables": ["Estratégia de portfólio", "Roadmap consolidado", "OKRs de área"],
    "overlap_roles": ["PM_001", "CPO_001"],
    "differentiation_notes": "GPM gerencia múltiplos produtos/PMs, enquanto PM foca em um produto.",
    "market_salary_range_brl": { "senior": [25000, 35000], "head": [35000, 55000] },
    "demand_trend": "Média"
  },
  {
    "role_id": "PMM_001",
    "title_pt": "Product Marketing Manager",
    "title_en": "Product Marketing Manager",
    "category": "Produto",
    "seniority_levels": ["Pleno", "Sênior", "Head"],
    "summary_pt": "Responsável por posicionamento, messaging e go-to-market do produto. Conecta produto, marketing e vendas.",
    "core_responsibilities": [
      "Definir posicionamento e messaging",
      "Criar materiais de enablement para vendas",
      "Planejar e executar lançamentos",
      "Analisar concorrência",
      "Coletar insights de mercado"
    ],
    "key_skills": ["Positioning", "Messaging", "Go-to-market", "Análise competitiva", "Storytelling"],
    "tools_common": ["HubSpot", "Salesforce", "Crayon", "Gong"],
    "typical_deliverables": ["Playbooks de vendas", "Battle cards", "Launch plans", "Análises de mercado"],
    "overlap_roles": ["PM_001", "MKT_001"],
    "differentiation_notes": "PMM foca em go-to-market e vendas, enquanto PM foca em desenvolvimento de produto.",
    "market_salary_range_brl": { "pleno": [12000, 18000], "senior": [18000, 28000], "head": [28000, 42000] },
    "demand_trend": "Alta"
  },
  {
    "role_id": "UXD_001",
    "title_pt": "UX Designer",
    "title_en": "UX Designer",
    "category": "Design",
    "seniority_levels": ["Júnior", "Pleno", "Sênior"],
    "summary_pt": "Responsável pela experiência do usuário. Conduz pesquisas, cria fluxos, wireframes e protótipos.",
    "core_responsibilities": [
      "Conduzir pesquisas com usuários",
      "Criar personas e jornadas",
      "Desenvolver wireframes e protótipos",
      "Realizar testes de usabilidade",
      "Documentar padrões de design"
    ],
    "key_skills": ["User research", "Wireframing", "Prototipagem", "Testes de usabilidade", "Design thinking"],
    "tools_common": ["Figma", "Sketch", "Miro", "Maze", "Hotjar"],
    "typical_deliverables": ["Wireframes", "Protótipos", "Relatórios de pesquisa", "Jornadas de usuário"],
    "overlap_roles": ["UID_001", "PD_001"],
    "differentiation_notes": "UX foca em pesquisa e fluxos, enquanto UI foca em visual e interações.",
    "market_salary_range_brl": { "junior": [4000, 7000], "pleno": [7000, 12000], "senior": [12000, 20000] },
    "demand_trend": "Alta"
  },
  {
    "role_id": "UID_001",
    "title_pt": "UI Designer",
    "title_en": "UI Designer",
    "category": "Design",
    "seniority_levels": ["Júnior", "Pleno", "Sênior"],
    "summary_pt": "Responsável pela interface visual do produto. Cria layouts, define estilos visuais e sistemas de design.",
    "core_responsibilities": [
      "Criar layouts e componentes visuais",
      "Definir paleta de cores e tipografia",
      "Desenvolver e manter design system",
      "Criar assets para desenvolvimento",
      "Garantir consistência visual"
    ],
    "key_skills": ["Visual design", "Tipografia", "Design systems", "Prototipagem", "Motion design"],
    "tools_common": ["Figma", "Adobe XD", "Illustrator", "After Effects"],
    "typical_deliverables": ["Layouts finais", "Design system", "Assets", "Specs para dev"],
    "overlap_roles": ["UXD_001", "PD_001"],
    "differentiation_notes": "UI foca em estética e visual, enquanto UX foca em funcionalidade e usabilidade.",
    "market_salary_range_brl": { "junior": [3500, 6000], "pleno": [6000, 11000], "senior": [11000, 18000] },
    "demand_trend": "Alta"
  },
  {
    "role_id": "PD_001",
    "title_pt": "Product Designer",
    "title_en": "Product Designer",
    "category": "Design",
    "seniority_levels": ["Pleno", "Sênior", "Lead"],
    "summary_pt": "Combina UX e UI em uma função. Responsável por toda a experiência do produto, do research ao visual final.",
    "core_responsibilities": [
      "Conduzir pesquisas e definir problemas",
      "Criar wireframes, protótipos e layouts finais",
      "Colaborar com PM e engenharia",
      "Iterar com base em feedback",
      "Manter design system"
    ],
    "key_skills": ["UX/UI completo", "Prototipagem", "Pesquisa", "Design systems", "Colaboração"],
    "tools_common": ["Figma", "Miro", "Notion", "Maze"],
    "typical_deliverables": ["Designs end-to-end", "Protótipos interativos", "Design system"],
    "overlap_roles": ["UXD_001", "UID_001"],
    "differentiation_notes": "Product Designer é generalista em design, cobrindo UX e UI.",
    "market_salary_range_brl": { "pleno": [9000, 14000], "senior": [14000, 22000], "lead": [22000, 35000] },
    "demand_trend": "Alta"
  },
  {
    "role_id": "DL_001",
    "title_pt": "Design Lead",
    "title_en": "Design Lead",
    "category": "Design",
    "seniority_levels": ["Sênior", "Head"],
    "summary_pt": "Lidera equipe de design. Responsável por qualidade, consistência e evolução do design na empresa.",
    "core_responsibilities": [
      "Liderar e mentorar designers",
      "Definir padrões de design",
      "Garantir qualidade e consistência",
      "Alinhar design com estratégia de negócio",
      "Colaborar com lideranças de produto e tech"
    ],
    "key_skills": ["Liderança", "Mentoria", "Design systems", "Estratégia de design", "Gestão de pessoas"],
    "tools_common": ["Figma", "Abstract", "Notion", "Lattice"],
    "typical_deliverables": ["Estratégia de design", "Design system maduro", "Processos de design"],
    "overlap_roles": ["PD_001", "HEAD_DES_001"],
    "differentiation_notes": "Design Lead gerencia pessoas e processos, além de fazer design hands-on.",
    "market_salary_range_brl": { "senior": [18000, 28000], "head": [28000, 45000] },
    "demand_trend": "Média"
  },
  {
    "role_id": "BA_001",
    "title_pt": "Business Analyst",
    "title_en": "Business Analyst",
    "category": "Negócios",
    "seniority_levels": ["Júnior", "Pleno", "Sênior"],
    "summary_pt": "Analisa processos de negócio e traduz necessidades em requisitos. Ponte entre negócio e tecnologia.",
    "core_responsibilities": [
      "Levantar e documentar requisitos",
      "Mapear processos de negócio",
      "Criar especificações funcionais",
      "Validar soluções com stakeholders",
      "Apoiar testes e homologação"
    ],
    "key_skills": ["Análise de requisitos", "Documentação", "Modelagem de processos", "SQL", "Comunicação"],
    "tools_common": ["Jira", "Confluence", "Bizagi", "Lucidchart", "Excel"],
    "typical_deliverables": ["Documentos de requisitos", "Diagramas de processo", "User stories"],
    "overlap_roles": ["PO_001", "SA_001"],
    "differentiation_notes": "BA foca em análise e documentação, enquanto PO foca em priorização e backlog.",
    "market_salary_range_brl": { "junior": [4000, 7000], "pleno": [7000, 12000], "senior": [12000, 18000] },
    "demand_trend": "Média"
  },
  {
    "role_id": "SA_001",
    "title_pt": "Systems Analyst",
    "title_en": "Systems Analyst",
    "category": "Negócios",
    "seniority_levels": ["Júnior", "Pleno", "Sênior"],
    "summary_pt": "Analisa sistemas existentes e propõe melhorias. Foco em integração e otimização de sistemas.",
    "core_responsibilities": [
      "Analisar sistemas existentes",
      "Propor melhorias e integrações",
      "Documentar especificações técnicas",
      "Apoiar desenvolvimento e testes",
      "Gerenciar mudanças em sistemas"
    ],
    "key_skills": ["Análise de sistemas", "Integração", "SQL", "Documentação técnica", "Resolução de problemas"],
    "tools_common": ["SQL", "Jira", "Confluence", "Postman", "Draw.io"],
    "typical_deliverables": ["Especificações técnicas", "Diagramas de integração", "Relatórios de análise"],
    "overlap_roles": ["BA_001", "DEV_001"],
    "differentiation_notes": "Systems Analyst é mais técnico que BA, focando em sistemas e integrações.",
    "market_salary_range_brl": { "junior": [4500, 7500], "pleno": [7500, 13000], "senior": [13000, 20000] },
    "demand_trend": "Média"
  },
  {
    "role_id": "PROJ_001",
    "title_pt": "Project Manager",
    "title_en": "Project Manager",
    "category": "Negócios",
    "seniority_levels": ["Pleno", "Sênior", "Head"],
    "summary_pt": "Gerencia projetos do início ao fim. Responsável por escopo, cronograma, budget e stakeholders.",
    "core_responsibilities": [
      "Planejar e gerenciar cronogramas",
      "Controlar escopo e mudanças",
      "Gerenciar riscos e issues",
      "Reportar status para stakeholders",
      "Garantir entregas no prazo e budget"
    ],
    "key_skills": ["Planejamento", "Gestão de riscos", "Comunicação", "Liderança", "Metodologias (PMI, Agile)"],
    "tools_common": ["MS Project", "Jira", "Monday", "Asana", "PowerPoint"],
    "typical_deliverables": ["Plano de projeto", "Status reports", "Análise de riscos"],
    "overlap_roles": ["SM_001", "PROG_001"],
    "differentiation_notes": "PM foca em projetos com início e fim, enquanto SM foca em processos contínuos.",
    "market_salary_range_brl": { "pleno": [10000, 16000], "senior": [16000, 25000], "head": [25000, 40000] },
    "demand_trend": "Média"
  },
  {
    "role_id": "SM_001",
    "title_pt": "Scrum Master",
    "title_en": "Scrum Master",
    "category": "Negócios",
    "seniority_levels": ["Pleno", "Sênior"],
    "summary_pt": "Facilita processos ágeis e remove impedimentos. Garante que o time siga práticas Scrum.",
    "core_responsibilities": [
      "Facilitar cerimônias ágeis",
      "Remover impedimentos do time",
      "Promover melhoria contínua",
      "Proteger o time de interferências",
      "Coaching em práticas ágeis"
    ],
    "key_skills": ["Facilitação", "Scrum/Kanban", "Coaching", "Resolução de conflitos", "Métricas ágeis"],
    "tools_common": ["Jira", "Miro", "Confluence", "Trello"],
    "typical_deliverables": ["Facilitação de sprints", "Retrospectivas", "Métricas de time"],
    "overlap_roles": ["PROJ_001", "AC_001"],
    "differentiation_notes": "SM foca em processo e time, não em gestão de projeto tradicional.",
    "market_salary_range_brl": { "pleno": [9000, 14000], "senior": [14000, 22000] },
    "demand_trend": "Média"
  },
  {
    "role_id": "AC_001",
    "title_pt": "Agile Coach",
    "title_en": "Agile Coach",
    "category": "Negócios",
    "seniority_levels": ["Sênior", "Head"],
    "summary_pt": "Promove transformação ágil na organização. Trabalha com múltiplos times e lideranças.",
    "core_responsibilities": [
      "Coaching de times e líderes",
      "Promover adoção de práticas ágeis",
      "Facilitar transformação organizacional",
      "Treinar Scrum Masters e POs",
      "Definir frameworks e métricas"
    ],
    "key_skills": ["Coaching", "Transformação organizacional", "Frameworks ágeis (SAFe, LeSS)", "Facilitação", "Liderança"],
    "tools_common": ["Jira", "Miro", "Confluence", "Klipfolio"],
    "typical_deliverables": ["Programas de transformação", "Treinamentos", "Métricas organizacionais"],
    "overlap_roles": ["SM_001", "CONS_001"],
    "differentiation_notes": "Agile Coach atua em nível organizacional, não apenas em um time.",
    "market_salary_range_brl": { "senior": [18000, 28000], "head": [28000, 45000] },
    "demand_trend": "Média"
  },
  {
    "role_id": "DEV_FE_001",
    "title_pt": "Desenvolvedor Front-end",
    "title_en": "Front-end Developer",
    "category": "Tecnologia",
    "seniority_levels": ["Júnior", "Pleno", "Sênior"],
    "summary_pt": "Desenvolve interfaces de usuário. Especialista em HTML, CSS, JavaScript e frameworks front-end.",
    "core_responsibilities": [
      "Desenvolver interfaces responsivas",
      "Implementar designs em código",
      "Otimizar performance de UI",
      "Integrar com APIs",
      "Garantir acessibilidade"
    ],
    "key_skills": ["React/Vue/Angular", "TypeScript", "CSS/Tailwind", "HTML5", "Performance"],
    "tools_common": ["VS Code", "Git", "Figma", "Chrome DevTools", "Webpack/Vite"],
    "typical_deliverables": ["Interfaces funcionais", "Componentes reutilizáveis", "Testes de UI"],
    "overlap_roles": ["DEV_FS_001", "UID_001"],
    "differentiation_notes": "Front-end foca exclusivamente em UI, enquanto Full Stack cobre back também.",
    "market_salary_range_brl": { "junior": [3500, 6000], "pleno": [6000, 12000], "senior": [12000, 20000] },
    "demand_trend": "Alta"
  },
  {
    "role_id": "DEV_BE_001",
    "title_pt": "Desenvolvedor Back-end",
    "title_en": "Back-end Developer",
    "category": "Tecnologia",
    "seniority_levels": ["Júnior", "Pleno", "Sênior"],
    "summary_pt": "Desenvolve lógica de servidor, APIs e integrações. Trabalha com bancos de dados e arquitetura.",
    "core_responsibilities": [
      "Desenvolver APIs e serviços",
      "Modelar e otimizar bancos de dados",
      "Implementar regras de negócio",
      "Garantir segurança e performance",
      "Integrar com sistemas externos"
    ],
    "key_skills": ["Node.js/Python/Java", "SQL/NoSQL", "APIs REST/GraphQL", "Arquitetura", "Segurança"],
    "tools_common": ["VS Code", "Git", "Postman", "Docker", "AWS/GCP"],
    "typical_deliverables": ["APIs funcionais", "Documentação técnica", "Testes automatizados"],
    "overlap_roles": ["DEV_FS_001", "SA_001"],
    "differentiation_notes": "Back-end foca em servidor e dados, sem responsabilidade de UI.",
    "market_salary_range_brl": { "junior": [4000, 7000], "pleno": [7000, 14000], "senior": [14000, 25000] },
    "demand_trend": "Alta"
  },
  {
    "role_id": "DEV_FS_001",
    "title_pt": "Desenvolvedor Full Stack",
    "title_en": "Full Stack Developer",
    "category": "Tecnologia",
    "seniority_levels": ["Pleno", "Sênior"],
    "summary_pt": "Desenvolve tanto front-end quanto back-end. Perfil versátil que cobre toda a stack.",
    "core_responsibilities": [
      "Desenvolver features end-to-end",
      "Trabalhar em UI e APIs",
      "Gerenciar deploy e infraestrutura básica",
      "Otimizar performance geral",
      "Colaborar com todos os times"
    ],
    "key_skills": ["React/Vue + Node/Python", "SQL/NoSQL", "APIs", "DevOps básico", "Arquitetura"],
    "tools_common": ["VS Code", "Git", "Docker", "AWS/Vercel", "Figma"],
    "typical_deliverables": ["Features completas", "Deploys", "Documentação"],
    "overlap_roles": ["DEV_FE_001", "DEV_BE_001"],
    "differentiation_notes": "Full Stack é generalista, sacrificando profundidade por versatilidade.",
    "market_salary_range_brl": { "pleno": [8000, 15000], "senior": [15000, 28000] },
    "demand_trend": "Alta"
  },
  {
    "role_id": "DEV_MOB_001",
    "title_pt": "Desenvolvedor Mobile",
    "title_en": "Mobile Developer",
    "category": "Tecnologia",
    "seniority_levels": ["Júnior", "Pleno", "Sênior"],
    "summary_pt": "Desenvolve aplicativos móveis para iOS e/ou Android. Especialista em UX mobile e performance.",
    "core_responsibilities": [
      "Desenvolver apps nativos ou híbridos",
      "Otimizar performance mobile",
      "Publicar em App Store/Play Store",
      "Implementar push notifications",
      "Integrar com APIs"
    ],
    "key_skills": ["React Native/Flutter/Swift/Kotlin", "UI mobile", "Performance", "APIs", "Stores"],
    "tools_common": ["Xcode", "Android Studio", "VS Code", "Firebase", "Fastlane"],
    "typical_deliverables": ["Apps funcionais", "Builds para stores", "Documentação"],
    "overlap_roles": ["DEV_FE_001", "DEV_FS_001"],
    "differentiation_notes": "Mobile foca exclusivamente em apps, com conhecimento específico de plataformas.",
    "market_salary_range_brl": { "junior": [4000, 7000], "pleno": [7000, 14000], "senior": [14000, 25000] },
    "demand_trend": "Alta"
  },
  {
    "role_id": "TL_001",
    "title_pt": "Tech Lead",
    "title_en": "Tech Lead",
    "category": "Tecnologia",
    "seniority_levels": ["Sênior", "Head"],
    "summary_pt": "Lidera tecnicamente um time de desenvolvimento. Combina hands-on coding com decisões de arquitetura.",
    "core_responsibilities": [
      "Definir arquitetura e padrões técnicos",
      "Mentorar desenvolvedores",
      "Code review e qualidade de código",
      "Participar de decisões de produto",
      "Resolver problemas técnicos complexos"
    ],
    "key_skills": ["Arquitetura", "Liderança técnica", "Code review", "Mentoria", "Decisão técnica"],
    "tools_common": ["Git", "Jira", "Confluence", "AWS/GCP", "CI/CD tools"],
    "typical_deliverables": ["Decisões de arquitetura", "Code reviews", "Documentação técnica"],
    "overlap_roles": ["DEV_FS_001", "EM_001"],
    "differentiation_notes": "Tech Lead foca em decisões técnicas, enquanto EM foca em gestão de pessoas.",
    "market_salary_range_brl": { "senior": [18000, 28000], "head": [28000, 45000] },
    "demand_trend": "Alta"
  },
  {
    "role_id": "EM_001",
    "title_pt": "Engineering Manager",
    "title_en": "Engineering Manager",
    "category": "Tecnologia",
    "seniority_levels": ["Sênior", "Head"],
    "summary_pt": "Gerencia time de engenharia. Foco em pessoas, processos e entrega, com menos hands-on técnico.",
    "core_responsibilities": [
      "Gerenciar e desenvolver pessoas",
      "Garantir entregas do time",
      "Definir processos de engenharia",
      "Contratar e fazer onboarding",
      "Alinhar com produto e negócio"
    ],
    "key_skills": ["Gestão de pessoas", "Processos", "Contratação", "Comunicação", "Visão técnica"],
    "tools_common": ["Jira", "Confluence", "Lattice", "Lever/Greenhouse", "Slack"],
    "typical_deliverables": ["1:1s", "Performance reviews", "Contratações", "Processos"],
    "overlap_roles": ["TL_001", "PROJ_001"],
    "differentiation_notes": "EM foca em pessoas e processos, enquanto Tech Lead foca em decisões técnicas.",
    "market_salary_range_brl": { "senior": [22000, 35000], "head": [35000, 55000] },
    "demand_trend": "Média"
  },
  {
    "role_id": "QA_001",
    "title_pt": "QA Engineer",
    "title_en": "QA Engineer",
    "category": "Tecnologia",
    "seniority_levels": ["Júnior", "Pleno", "Sênior"],
    "summary_pt": "Garante qualidade do software através de testes manuais e automatizados.",
    "core_responsibilities": [
      "Planejar e executar testes",
      "Automatizar testes",
      "Reportar e acompanhar bugs",
      "Definir critérios de qualidade",
      "Colaborar com desenvolvedores"
    ],
    "key_skills": ["Testes manuais/automatizados", "Selenium/Cypress", "API testing", "SQL", "Metodologias"],
    "tools_common": ["Selenium", "Cypress", "Postman", "Jira", "TestRail"],
    "typical_deliverables": ["Casos de teste", "Automações", "Relatórios de bugs"],
    "overlap_roles": ["DEV_FS_001", "SDET_001"],
    "differentiation_notes": "QA foca em garantia de qualidade, podendo ou não automatizar.",
    "market_salary_range_brl": { "junior": [3500, 6000], "pleno": [6000, 11000], "senior": [11000, 18000] },
    "demand_trend": "Média"
  },
  {
    "role_id": "DEVOPS_001",
    "title_pt": "DevOps Engineer",
    "title_en": "DevOps Engineer",
    "category": "Tecnologia",
    "seniority_levels": ["Pleno", "Sênior"],
    "summary_pt": "Gerencia infraestrutura, CI/CD e automação. Ponte entre desenvolvimento e operações.",
    "core_responsibilities": [
      "Gerenciar infraestrutura cloud",
      "Configurar pipelines CI/CD",
      "Automatizar deploys",
      "Monitorar e garantir disponibilidade",
      "Otimizar custos de infra"
    ],
    "key_skills": ["AWS/GCP/Azure", "Docker/Kubernetes", "CI/CD", "Terraform/Ansible", "Linux"],
    "tools_common": ["AWS/GCP", "Docker", "Kubernetes", "Jenkins/GitHub Actions", "Terraform"],
    "typical_deliverables": ["Pipelines", "Infra automatizada", "Documentação de infra"],
    "overlap_roles": ["SRE_001", "DEV_BE_001"],
    "differentiation_notes": "DevOps foca em automação e CI/CD, enquanto SRE foca em confiabilidade.",
    "market_salary_range_brl": { "pleno": [10000, 18000], "senior": [18000, 30000] },
    "demand_trend": "Alta"
  },
  {
    "role_id": "SRE_001",
    "title_pt": "Site Reliability Engineer",
    "title_en": "Site Reliability Engineer",
    "category": "Tecnologia",
    "seniority_levels": ["Pleno", "Sênior"],
    "summary_pt": "Garante confiabilidade e disponibilidade de sistemas. Foco em SLOs, incident response e automação.",
    "core_responsibilities": [
      "Definir e monitorar SLOs/SLAs",
      "Responder a incidentes",
      "Automatizar operações",
      "Realizar post-mortems",
      "Melhorar observabilidade"
    ],
    "key_skills": ["Observabilidade", "Incident management", "Automação", "Cloud", "Programação"],
    "tools_common": ["Datadog", "PagerDuty", "Prometheus", "Grafana", "AWS/GCP"],
    "typical_deliverables": ["Dashboards", "Runbooks", "Post-mortems", "Automações"],
    "overlap_roles": ["DEVOPS_001", "DEV_BE_001"],
    "differentiation_notes": "SRE foca em confiabilidade e métricas, DevOps em automação e CI/CD.",
    "market_salary_range_brl": { "pleno": [12000, 20000], "senior": [20000, 35000] },
    "demand_trend": "Alta"
  },
  {
    "role_id": "DA_001",
    "title_pt": "Data Analyst",
    "title_en": "Data Analyst",
    "category": "Dados",
    "seniority_levels": ["Júnior", "Pleno", "Sênior"],
    "summary_pt": "Analisa dados para gerar insights de negócio. Cria dashboards e relatórios.",
    "core_responsibilities": [
      "Analisar dados de negócio",
      "Criar dashboards e relatórios",
      "Identificar tendências e padrões",
      "Responder perguntas de stakeholders",
      "Garantir qualidade de dados"
    ],
    "key_skills": ["SQL", "Excel/Sheets", "Tableau/Power BI", "Estatística básica", "Storytelling"],
    "tools_common": ["SQL", "Tableau", "Power BI", "Excel", "Metabase"],
    "typical_deliverables": ["Dashboards", "Relatórios", "Análises ad-hoc"],
    "overlap_roles": ["DS_001", "BI_001"],
    "differentiation_notes": "Data Analyst foca em análise descritiva, enquanto Data Scientist em modelagem.",
    "market_salary_range_brl": { "junior": [3500, 6000], "pleno": [6000, 11000], "senior": [11000, 18000] },
    "demand_trend": "Alta"
  },
  {
    "role_id": "DS_001",
    "title_pt": "Data Scientist",
    "title_en": "Data Scientist",
    "category": "Dados",
    "seniority_levels": ["Pleno", "Sênior"],
    "summary_pt": "Aplica estatística e machine learning para resolver problemas de negócio. Cria modelos preditivos.",
    "core_responsibilities": [
      "Desenvolver modelos de ML",
      "Analisar dados complexos",
      "Criar experimentos (A/B tests)",
      "Comunicar resultados para negócio",
      "Colaborar com engenharia para deploy"
    ],
    "key_skills": ["Python/R", "Machine Learning", "Estatística", "SQL", "Comunicação"],
    "tools_common": ["Python", "Jupyter", "Scikit-learn", "TensorFlow/PyTorch", "SQL"],
    "typical_deliverables": ["Modelos de ML", "Análises estatísticas", "Experimentos"],
    "overlap_roles": ["DA_001", "MLE_001"],
    "differentiation_notes": "Data Scientist foca em modelagem, enquanto MLE foca em produtização de modelos.",
    "market_salary_range_brl": { "pleno": [12000, 20000], "senior": [20000, 35000] },
    "demand_trend": "Alta"
  },
  {
    "role_id": "DE_001",
    "title_pt": "Data Engineer",
    "title_en": "Data Engineer",
    "category": "Dados",
    "seniority_levels": ["Pleno", "Sênior"],
    "summary_pt": "Constrói e mantém infraestrutura de dados. Responsável por pipelines, data lakes e warehouses.",
    "core_responsibilities": [
      "Construir pipelines de dados",
      "Gerenciar data warehouse",
      "Garantir qualidade e governança de dados",
      "Otimizar performance de queries",
      "Integrar fontes de dados"
    ],
    "key_skills": ["SQL", "Python/Scala", "ETL/ELT", "Data warehousing", "Cloud (AWS/GCP)"],
    "tools_common": ["Airflow", "dbt", "Snowflake/BigQuery", "Spark", "AWS/GCP"],
    "typical_deliverables": ["Pipelines", "Data models", "Documentação de dados"],
    "overlap_roles": ["DS_001", "DEVOPS_001"],
    "differentiation_notes": "Data Engineer foca em infraestrutura de dados, não em análise ou modelagem.",
    "market_salary_range_brl": { "pleno": [12000, 20000], "senior": [20000, 35000] },
    "demand_trend": "Alta"
  },
  {
    "role_id": "MLE_001",
    "title_pt": "ML Engineer",
    "title_en": "Machine Learning Engineer",
    "category": "Dados",
    "seniority_levels": ["Pleno", "Sênior"],
    "summary_pt": "Coloca modelos de ML em produção. Combina engenharia de software com machine learning.",
    "core_responsibilities": [
      "Produtizar modelos de ML",
      "Criar pipelines de treinamento",
      "Monitorar performance de modelos",
      "Otimizar inferência",
      "Colaborar com Data Scientists"
    ],
    "key_skills": ["Python", "MLOps", "Docker/Kubernetes", "Cloud ML services", "Engenharia de software"],
    "tools_common": ["MLflow", "Kubeflow", "SageMaker", "Docker", "Kubernetes"],
    "typical_deliverables": ["Modelos em produção", "Pipelines de ML", "Monitoramento"],
    "overlap_roles": ["DS_001", "DE_001"],
    "differentiation_notes": "MLE foca em engenharia e produtização, não em criar modelos.",
    "market_salary_range_brl": { "pleno": [15000, 25000], "senior": [25000, 40000] },
    "demand_trend": "Alta"
  },
  {
    "role_id": "CSM_001",
    "title_pt": "Customer Success Manager",
    "title_en": "Customer Success Manager",
    "category": "Customer Success",
    "seniority_levels": ["Pleno", "Sênior", "Head"],
    "summary_pt": "Garante sucesso e retenção de clientes. Responsável por onboarding, expansão e health score.",
    "core_responsibilities": [
      "Gerenciar carteira de clientes",
      "Conduzir onboarding",
      "Monitorar health score e churn",
      "Identificar oportunidades de upsell",
      "Resolver problemas e escalar quando necessário"
    ],
    "key_skills": ["Relacionamento", "Comunicação", "Análise de métricas", "Negociação", "Empatia"],
    "tools_common": ["Salesforce", "Gainsight", "HubSpot", "Intercom", "Mixpanel"],
    "typical_deliverables": ["QBRs", "Playbooks de CS", "Reports de health", "Upsells"],
    "overlap_roles": ["AM_001", "SUPP_001"],
    "differentiation_notes": "CSM foca em sucesso e retenção, enquanto AM foca em vendas e expansão.",
    "market_salary_range_brl": { "pleno": [8000, 14000], "senior": [14000, 22000], "head": [22000, 35000] },
    "demand_trend": "Alta"
  },
  {
    "role_id": "AM_001",
    "title_pt": "Account Manager",
    "title_en": "Account Manager",
    "category": "Customer Success",
    "seniority_levels": ["Pleno", "Sênior"],
    "summary_pt": "Gerencia contas e relacionamento comercial. Foco em renovação, expansão e upsell.",
    "core_responsibilities": [
      "Gerenciar renovações",
      "Identificar e fechar upsells",
      "Manter relacionamento com clientes",
      "Negociar contratos",
      "Colaborar com CS e produto"
    ],
    "key_skills": ["Negociação", "Vendas", "Relacionamento", "Análise de contas", "Comunicação"],
    "tools_common": ["Salesforce", "HubSpot", "LinkedIn", "Gong", "Docusign"],
    "typical_deliverables": ["Renovações", "Upsells", "Forecasts", "Reports de pipeline"],
    "overlap_roles": ["CSM_001", "AE_001"],
    "differentiation_notes": "AM foca em vendas para clientes existentes, enquanto AE em novos clientes.",
    "market_salary_range_brl": { "pleno": [10000, 18000], "senior": [18000, 30000] },
    "demand_trend": "Média"
  },
  {
    "role_id": "SUPP_001",
    "title_pt": "Customer Support Specialist",
    "title_en": "Customer Support Specialist",
    "category": "Customer Success",
    "seniority_levels": ["Júnior", "Pleno", "Sênior"],
    "summary_pt": "Resolve problemas e dúvidas de clientes. Primeiro ponto de contato para suporte.",
    "core_responsibilities": [
      "Responder tickets e chamados",
      "Resolver problemas técnicos básicos",
      "Escalar issues complexos",
      "Documentar soluções na base de conhecimento",
      "Coletar feedback de clientes"
    ],
    "key_skills": ["Comunicação", "Resolução de problemas", "Empatia", "Conhecimento de produto", "Paciência"],
    "tools_common": ["Zendesk", "Intercom", "Freshdesk", "Jira", "Confluence"],
    "typical_deliverables": ["Tickets resolvidos", "Artigos de KB", "Reports de suporte"],
    "overlap_roles": ["CSM_001", "TAM_001"],
    "differentiation_notes": "Support é reativo e resolve problemas, CSM é proativo e foca em sucesso.",
    "market_salary_range_brl": { "junior": [2500, 4500], "pleno": [4500, 8000], "senior": [8000, 14000] },
    "demand_trend": "Média"
  },
  {
    "role_id": "AE_001",
    "title_pt": "Account Executive",
    "title_en": "Account Executive",
    "category": "Vendas",
    "seniority_levels": ["Pleno", "Sênior"],
    "summary_pt": "Responsável por fechar novos negócios. Conduz demos, negociações e fecha contratos.",
    "core_responsibilities": [
      "Conduzir demos e apresentações",
      "Negociar e fechar contratos",
      "Gerenciar pipeline de vendas",
      "Atingir metas de vendas",
      "Colaborar com SDR e CS"
    ],
    "key_skills": ["Vendas consultivas", "Negociação", "Demo skills", "Pipeline management", "Fechamento"],
    "tools_common": ["Salesforce", "HubSpot", "Gong", "LinkedIn", "Docusign"],
    "typical_deliverables": ["Contratos fechados", "Pipeline", "Forecasts"],
    "overlap_roles": ["AM_001", "SDR_001"],
    "differentiation_notes": "AE fecha novos negócios, AM gerencia clientes existentes.",
    "market_salary_range_brl": { "pleno": [10000, 18000], "senior": [18000, 35000] },
    "demand_trend": "Alta"
  },
  {
    "role_id": "SDR_001",
    "title_pt": "Sales Development Representative",
    "title_en": "Sales Development Representative",
    "category": "Vendas",
    "seniority_levels": ["Júnior", "Pleno"],
    "summary_pt": "Prospecta e qualifica leads. Gera oportunidades para Account Executives.",
    "core_responsibilities": [
      "Prospectar leads outbound",
      "Qualificar leads inbound",
      "Agendar reuniões para AEs",
      "Manter CRM atualizado",
      "Atingir metas de atividades"
    ],
    "key_skills": ["Prospecção", "Comunicação", "Resiliência", "CRM", "Qualificação (BANT/MEDDIC)"],
    "tools_common": ["Salesforce", "HubSpot", "LinkedIn Sales Navigator", "Outreach", "Apollo"],
    "typical_deliverables": ["Leads qualificados", "Reuniões agendadas", "Reports de atividades"],
    "overlap_roles": ["AE_001", "BDR_001"],
    "differentiation_notes": "SDR qualifica e agenda, AE conduz e fecha.",
    "market_salary_range_brl": { "junior": [3000, 5000], "pleno": [5000, 9000] },
    "demand_trend": "Alta"
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
- table_markdown: Tabela comparativa em Markdown com colunas: Cargo, Foco Principal, Senioridades, Demanda, Fit com Requisitos (1-5)
- detailed_justification: 3-5 parágrafos explicando vantagens, riscos e trade-offs de cada cargo
- recommended_role: ID do cargo mais adequado (ex: "PM_001")
- suggested_job_title: Título sugerido para a vaga em português
- short_briefing: Array de exatamente 3 bullets com briefing da posição recomendada

Responda APENAS em JSON válido, sem markdown code blocks.`;

    const userPrompt = `## Cargos selecionados para comparação:
${selectedRoles.map(r => `
### ${r.title_pt} (${r.role_id})
- Categoria: ${r.category}
- Senioridades: ${r.seniority_levels.join(', ')}
- Resumo: ${r.summary_pt}
- Responsabilidades: ${r.core_responsibilities.join('; ')}
- Skills: ${r.key_skills.join(', ')}
- Demanda: ${r.demand_trend}
- Overlap: ${r.overlap_roles.join(', ')}
- Diferenciação: ${r.differentiation_notes}
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
      title_pt: r.title_pt,
      category: r.category,
      seniority_levels: r.seniority_levels,
      demand_trend: r.demand_trend
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
