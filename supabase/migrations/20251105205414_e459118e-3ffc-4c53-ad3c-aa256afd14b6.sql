-- Add share_config column to share_links table
ALTER TABLE public.share_links
ADD COLUMN IF NOT EXISTS share_config jsonb DEFAULT '{
  "exibir_sobre": true,
  "exibir_responsabilidades": true,
  "exibir_requisitos": true,
  "exibir_beneficios": true,
  "exibir_localizacao": true,
  "exibir_salario": true,
  "empresa_confidencial": false,
  "exibir_observacoes": true,
  "texto_sobre_customizado": null,
  "responsabilidades_customizadas": null,
  "requisitos_customizados": null
}'::jsonb;