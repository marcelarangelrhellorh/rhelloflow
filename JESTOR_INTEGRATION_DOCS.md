# Documentação de Integração Jestor ↔ Lovable Flow

> **Versão:** 1.0.0  
> **Última atualização:** 2025-01-08  
> **Responsável:** Equipe de Integração rhello

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura](#2-arquitetura)
3. [Autenticação](#3-autenticação)
4. [Idempotência](#4-idempotência)
5. [Eventos Suportados](#5-eventos-suportados)
6. [Payloads e Mapeamento de Campos](#6-payloads-e-mapeamento-de-campos)
7. [Status Válidos](#7-status-válidos)
8. [Matriz de Responsabilidades](#8-matriz-de-responsabilidades)
9. [Códigos de Resposta](#9-códigos-de-resposta)
10. [Troubleshooting](#10-troubleshooting)
11. [Queries de Verificação](#11-queries-de-verificação)
12. [Anexos](#12-anexos)

---

## 1. Visão Geral

Esta documentação descreve a integração bidirecional entre **Jestor** e **Lovable Flow** para sincronização de eventos de recrutamento.

### Endpoint do Webhook

```
POST https://feclxfhohmovmxqxyexz.supabase.co/functions/v1/jestor-webhook
```

### Características

| Característica | Valor |
|----------------|-------|
| Protocolo | HTTPS |
| Método | POST |
| Content-Type | application/json |
| Autenticação | Bearer Token |
| Idempotência | Via `correlation_id` |
| Retry Policy | 3 tentativas (1s, 5s, 30s) |
| JWT Verification | Desabilitado |

---

## 2. Arquitetura

```
┌─────────────────┐         ┌──────────────────────┐         ┌─────────────────┐
│                 │         │                      │         │                 │
│     JESTOR      │ ──────► │   jestor-webhook     │ ──────► │   SUPABASE DB   │
│    (Builder)    │  POST   │   (Edge Function)    │  UPDATE │                 │
│                 │         │                      │         │                 │
└─────────────────┘         └──────────────────────┘         └─────────────────┘
                                     │
                                     │ INSERT
                                     ▼
                            ┌──────────────────────┐
                            │    audit_events      │
                            │   (Log de Auditoria) │
                            └──────────────────────┘
```

### Fluxo de Processamento

1. Jestor envia evento via POST
2. Edge Function valida Bearer Token
3. Verifica idempotência via `correlation_id`
4. Processa evento conforme tipo
5. Registra em `audit_events`
6. Retorna resposta HTTP

---

## 3. Autenticação

### Header Obrigatório

```http
Authorization: Bearer <JESTOR_WEBHOOK_SECRET>
```

### Configuração

O token está configurado como secret no Supabase Edge Functions:

```bash
# Nome do secret
JESTOR_WEBHOOK_SECRET
```

### Validação

```typescript
const authHeader = req.headers.get("Authorization");
const expectedToken = Deno.env.get("JESTOR_WEBHOOK_SECRET");

if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), { 
    status: 401 
  });
}
```

---

## 4. Idempotência

### Mecanismo

Eventos duplicados são detectados e ignorados usando `correlation_id`.

### Headers

```http
Idempotency-Key: <UUID>
```

**Nota:** O `correlation_id` pode vir no header `Idempotency-Key` ou no body do payload.

### Verificação

```sql
SELECT id FROM audit_events 
WHERE correlation_id = '<correlation_id>' 
LIMIT 1;
```

### Resposta para Duplicados

```json
{
  "success": true,
  "message": "Evento já processado anteriormente",
  "correlation_id": "<correlation_id>"
}
```

---

## 5. Eventos Suportados

| Evento | Descrição | Tabela Afetada | Ação |
|--------|-----------|----------------|------|
| `vaga.status_changed` | Status da vaga alterado | `vagas` | UPDATE |
| `candidato.status_changed` | Status do candidato alterado | `candidatos` | UPDATE |
| `candidato.created` | Candidato criado | - | LOG ONLY |
| `feedback.created` | Feedback criado | `feedbacks` | UPDATE idempotency |
| `task.created` | Tarefa criada | `tasks` | UPDATE idempotency |
| `task.status_changed` | Status da tarefa alterado | `tasks` | UPDATE idempotency |

---

## 6. Payloads e Mapeamento de Campos

### 6.1 Estrutura Padrão do Payload

```typescript
interface JestorWebhookPayload {
  event_type: string;           // Tipo do evento
  timestamp_utc: string;        // ISO 8601
  correlation_id: string;       // UUID para idempotência
  resource: {
    type: string;               // Tipo do recurso (vaga, candidato, etc)
    id: string;                 // UUID do recurso
  };
  actor: {
    id: string;                 // UUID do usuário
    type: "user" | "system";    // Tipo do ator
    display_name: string;       // Nome para exibição
  };
  payload: Record<string, any>; // Dados específicos do evento
}
```

---

### 6.2 Evento: `vaga.status_changed`

#### Descrição
Disparado quando o status de uma vaga é alterado no Jestor.

#### Payload Exemplo

```json
{
  "event_type": "vaga.status_changed",
  "timestamp_utc": "2025-01-08T10:00:00Z",
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
  "resource": {
    "type": "vaga",
    "id": "123e4567-e89b-12d3-a456-426614174000"
  },
  "actor": {
    "id": "987fcdeb-51a2-3bc4-d567-890123456789",
    "type": "user",
    "display_name": "João Silva"
  },
  "payload": {
    "old_status": "Em andamento",
    "new_status": "Concluída",
    "reason": "Candidato contratado"
  }
}
```

#### Mapeamento de Campos

| Campo Payload | Coluna DB | Tabela | Tipo | Obrigatório |
|---------------|-----------|--------|------|-------------|
| `resource.id` | `id` | `vagas` | UUID | ✅ |
| `payload.new_status` | `status` | `vagas` | status_vaga | ✅ |
| `actor.id` | `last_status_change_by` | `vagas` | UUID | ❌ |

#### cURL de Teste

```bash
curl -X POST \
  'https://feclxfhohmovmxqxyexz.supabase.co/functions/v1/jestor-webhook' \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000' \
  -d '{
    "event_type": "vaga.status_changed",
    "timestamp_utc": "2025-01-08T10:00:00Z",
    "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
    "resource": {
      "type": "vaga",
      "id": "SEU_VAGA_ID_AQUI"
    },
    "actor": {
      "id": "SEU_USER_ID_AQUI",
      "type": "user",
      "display_name": "Teste Jestor"
    },
    "payload": {
      "old_status": "Em andamento",
      "new_status": "Concluída",
      "reason": "Teste de integração"
    }
  }'
```

---

### 6.3 Evento: `candidato.status_changed`

#### Descrição
Disparado quando o status de um candidato é alterado no Jestor.

#### Payload Exemplo

```json
{
  "event_type": "candidato.status_changed",
  "timestamp_utc": "2025-01-08T11:00:00Z",
  "correlation_id": "660e8400-e29b-41d4-a716-446655440001",
  "resource": {
    "type": "candidato",
    "id": "456e7890-e89b-12d3-a456-426614174001"
  },
  "actor": {
    "id": "987fcdeb-51a2-3bc4-d567-890123456789",
    "type": "user",
    "display_name": "Maria Santos"
  },
  "payload": {
    "old_status": "Shortlist",
    "new_status": "Contratado",
    "vaga_id": "123e4567-e89b-12d3-a456-426614174000"
  }
}
```

#### Mapeamento de Campos

| Campo Payload | Coluna DB | Tabela | Tipo | Obrigatório |
|---------------|-----------|--------|------|-------------|
| `resource.id` | `id` | `candidatos` | UUID | ✅ |
| `payload.new_status` | `status` | `candidatos` | status_candidato | ✅ |
| `payload.new_status` = "Contratado" | `hired_at` | `candidatos` | TIMESTAMPTZ | Automático |

#### Regras de Negócio

1. **Status "Contratado"**: Quando `new_status = "Contratado"`, o campo `hired_at` é automaticamente preenchido com `now()`.

2. **Status "Shortlist"**: Trigger `trg_set_is_visible_for_client` define automaticamente `is_visible_for_client = true`.

#### cURL de Teste

```bash
curl -X POST \
  'https://feclxfhohmovmxqxyexz.supabase.co/functions/v1/jestor-webhook' \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: 660e8400-e29b-41d4-a716-446655440001' \
  -d '{
    "event_type": "candidato.status_changed",
    "timestamp_utc": "2025-01-08T11:00:00Z",
    "correlation_id": "660e8400-e29b-41d4-a716-446655440001",
    "resource": {
      "type": "candidato",
      "id": "SEU_CANDIDATO_ID_AQUI"
    },
    "actor": {
      "id": "SEU_USER_ID_AQUI",
      "type": "user",
      "display_name": "Teste Jestor"
    },
    "payload": {
      "old_status": "Shortlist",
      "new_status": "Contratado",
      "vaga_id": "SEU_VAGA_ID_AQUI"
    }
  }'
```

---

### 6.4 Evento: `candidato.created`

#### Descrição
Disparado quando um candidato é criado no Jestor. **Apenas registra log**, não cria candidato.

#### Payload Exemplo

```json
{
  "event_type": "candidato.created",
  "timestamp_utc": "2025-01-08T12:00:00Z",
  "correlation_id": "770e8400-e29b-41d4-a716-446655440002",
  "resource": {
    "type": "candidato",
    "id": "789e0123-e89b-12d3-a456-426614174002"
  },
  "actor": {
    "id": "987fcdeb-51a2-3bc4-d567-890123456789",
    "type": "system",
    "display_name": "Jestor Automation"
  },
  "payload": {
    "nome": "Carlos Oliveira",
    "email": "carlos@email.com",
    "vaga_id": "123e4567-e89b-12d3-a456-426614174000"
  }
}
```

#### Mapeamento de Campos

| Campo Payload | Coluna DB | Tabela | Tipo | Obrigatório |
|---------------|-----------|--------|------|-------------|
| - | - | - | - | - |

**Nota:** Este evento é apenas para logging. Não há mapeamento de campos para atualização.

---

### 6.5 Evento: `feedback.created`

#### Descrição
Disparado quando um feedback é criado no Jestor.

#### Payload Exemplo

```json
{
  "event_type": "feedback.created",
  "timestamp_utc": "2025-01-08T13:00:00Z",
  "correlation_id": "880e8400-e29b-41d4-a716-446655440003",
  "resource": {
    "type": "feedback",
    "id": "012e3456-e89b-12d3-a456-426614174003"
  },
  "actor": {
    "id": "987fcdeb-51a2-3bc4-d567-890123456789",
    "type": "user",
    "display_name": "Ana Costa"
  },
  "payload": {
    "candidato_id": "456e7890-e89b-12d3-a456-426614174001",
    "vaga_id": "123e4567-e89b-12d3-a456-426614174000",
    "conteudo": "Candidato excelente, recomendo contratação."
  }
}
```

#### Mapeamento de Campos

| Campo Payload | Coluna DB | Tabela | Tipo | Obrigatório |
|---------------|-----------|--------|------|-------------|
| `resource.id` | `id` | `feedbacks` | UUID | ✅ |
| `correlation_id` | `idempotency_key` | `feedbacks` | TEXT | ✅ |

---

### 6.6 Evento: `task.created`

#### Descrição
Disparado quando uma tarefa é criada no Jestor.

#### Payload Exemplo

```json
{
  "event_type": "task.created",
  "timestamp_utc": "2025-01-08T14:00:00Z",
  "correlation_id": "990e8400-e29b-41d4-a716-446655440004",
  "resource": {
    "type": "task",
    "id": "345e6789-e89b-12d3-a456-426614174004"
  },
  "actor": {
    "id": "987fcdeb-51a2-3bc4-d567-890123456789",
    "type": "user",
    "display_name": "Pedro Lima"
  },
  "payload": {
    "title": "Agendar entrevista",
    "assignee_id": "abc12345-e89b-12d3-a456-426614174005",
    "vaga_id": "123e4567-e89b-12d3-a456-426614174000",
    "due_date": "2025-01-10T10:00:00Z"
  }
}
```

#### Mapeamento de Campos

| Campo Payload | Coluna DB | Tabela | Tipo | Obrigatório |
|---------------|-----------|--------|------|-------------|
| `resource.id` | `id` | `tasks` | UUID | ✅ |
| `correlation_id` | `idempotency_key` | `tasks` | TEXT | ✅ |

---

### 6.7 Evento: `task.status_changed`

#### Descrição
Disparado quando o status de uma tarefa é alterado no Jestor.

#### Payload Exemplo

```json
{
  "event_type": "task.status_changed",
  "timestamp_utc": "2025-01-08T15:00:00Z",
  "correlation_id": "aa0e8400-e29b-41d4-a716-446655440005",
  "resource": {
    "type": "task",
    "id": "345e6789-e89b-12d3-a456-426614174004"
  },
  "actor": {
    "id": "987fcdeb-51a2-3bc4-d567-890123456789",
    "type": "user",
    "display_name": "Pedro Lima"
  },
  "payload": {
    "old_status": "to_do",
    "new_status": "done"
  }
}
```

#### Mapeamento de Campos

| Campo Payload | Coluna DB | Tabela | Tipo | Obrigatório |
|---------------|-----------|--------|------|-------------|
| `resource.id` | `id` | `tasks` | UUID | ✅ |
| `correlation_id` | `idempotency_key` | `tasks` | TEXT | ✅ |

---

## 7. Status Válidos

### 7.1 Status de Vagas

| Label | Slug | Ordem | Tipo |
|-------|------|-------|------|
| A iniciar | a_iniciar | 1 | active |
| Em andamento | em_andamento | 2 | active |
| Em análise | em_analise | 3 | active |
| Aguardando feedback | aguardando_feedback | 4 | active |
| Oferta enviada | oferta_enviada | 5 | active |
| Pausada | pausada | 6 | paused |
| Cancelada | cancelada | 7 | closed |
| Concluída | concluida | 8 | closed |

### 7.2 Status de Candidatos

| Status | Descrição | Regra Especial |
|--------|-----------|----------------|
| Em análise | Candidato em análise inicial | - |
| Em entrevista | Em processo de entrevista | - |
| Aprovado Rhello | Aprovado pela equipe rhello | - |
| Shortlist | Na lista final para o cliente | `is_visible_for_client = true` |
| Aprovado cliente | Aprovado pelo cliente | - |
| Contratado | Candidato contratado | `hired_at = now()` |
| Reprovado | Candidato reprovado | - |
| Desistente | Candidato desistiu | - |
| Standby | Em espera | - |

---

## 8. Matriz de Responsabilidades

| Evento | Owner Jestor | Owner Flow | Validações |
|--------|--------------|------------|------------|
| `vaga.status_changed` | Automação Jestor | Edge Function | Status válido, vaga existe |
| `candidato.status_changed` | Automação Jestor | Edge Function | Status válido, candidato existe |
| `candidato.created` | Automação Jestor | Edge Function | Log only |
| `feedback.created` | Automação Jestor | Edge Function | Feedback existe |
| `task.created` | Automação Jestor | Edge Function | Task existe |
| `task.status_changed` | Automação Jestor | Edge Function | Task existe |

### Contatos

| Área | Responsável | Contato |
|------|-------------|---------|
| Jestor Builder | Equipe Jestor | - |
| Flow Backend | Equipe Dev rhello | - |
| Flow Frontend | Equipe Dev rhello | - |

---

## 9. Códigos de Resposta

| Código | Significado | Ação Recomendada |
|--------|-------------|------------------|
| 200 | Sucesso | Nenhuma |
| 400 | Payload inválido | Verificar estrutura JSON |
| 401 | Não autorizado | Verificar Bearer Token |
| 405 | Método não permitido | Usar POST |
| 500 | Erro interno | Contactar equipe Flow |

### Respostas de Sucesso

```json
// Evento processado
{
  "success": true,
  "message": "Evento vaga.status_changed processado com sucesso"
}

// Evento duplicado (idempotência)
{
  "success": true,
  "message": "Evento já processado anteriormente",
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Respostas de Erro

```json
// Token inválido
{
  "error": "Unauthorized"
}

// Payload inválido
{
  "error": "event_type é obrigatório"
}

// Recurso não encontrado
{
  "error": "Vaga não encontrada"
}
```

---

## 10. Troubleshooting

### 10.1 Evento não está sendo processado

1. Verificar se o Bearer Token está correto
2. Verificar se o `event_type` é suportado
3. Verificar logs do Edge Function
4. Verificar se o recurso (vaga/candidato) existe

### 10.2 Evento duplicado não está sendo ignorado

1. Verificar se `correlation_id` está sendo enviado
2. Verificar se o mesmo `correlation_id` já existe em `audit_events`

### 10.3 Status não está sendo atualizado

1. Verificar se o status enviado é válido (ver seção 7)
2. Verificar RLS policies da tabela
3. Verificar logs de erro no Supabase

### 10.4 Trigger `is_visible_for_client` não dispara

1. Verificar se o status é exatamente "Shortlist"
2. Verificar se o trigger existe: `trg_set_is_visible_for_client`

---

## 11. Queries de Verificação

### Verificar eventos recebidos

```sql
SELECT 
  id,
  action,
  correlation_id,
  timestamp_utc,
  actor->>'display_name' as actor_name,
  resource->>'type' as resource_type,
  resource->>'id' as resource_id
FROM audit_events
WHERE action LIKE 'jestor.%'
ORDER BY timestamp_utc DESC
LIMIT 20;
```

### Verificar duplicados

```sql
SELECT 
  correlation_id,
  COUNT(*) as count
FROM audit_events
WHERE correlation_id IS NOT NULL
GROUP BY correlation_id
HAVING COUNT(*) > 1;
```

### Verificar candidatos visíveis para cliente

```sql
SELECT 
  id,
  nome_completo,
  status,
  is_visible_for_client,
  hired_at
FROM candidatos
WHERE is_visible_for_client = true
ORDER BY criado_em DESC;
```

### Verificar última mudança de status de vaga

```sql
SELECT 
  v.id,
  v.titulo,
  v.status,
  v.last_status_change_by,
  p.full_name as changed_by_name
FROM vagas v
LEFT JOIN profiles p ON v.last_status_change_by = p.id
ORDER BY v.updated_at DESC
LIMIT 10;
```

### Verificar job_stage_history

```sql
SELECT 
  jsh.id,
  jsh.job_id,
  jsh.from_status,
  jsh.to_status,
  jsh.correlation_id,
  jsh.changed_at,
  p.full_name as changed_by
FROM job_stage_history jsh
LEFT JOIN profiles p ON jsh.changed_by = p.id
ORDER BY jsh.changed_at DESC
LIMIT 20;
```

---

## 12. Anexos

### 12.1 JSON Schema do Payload

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "JestorWebhookPayload",
  "type": "object",
  "required": ["event_type", "timestamp_utc", "correlation_id", "resource", "actor", "payload"],
  "properties": {
    "event_type": {
      "type": "string",
      "enum": [
        "vaga.status_changed",
        "candidato.status_changed",
        "candidato.created",
        "feedback.created",
        "task.created",
        "task.status_changed"
      ]
    },
    "timestamp_utc": {
      "type": "string",
      "format": "date-time"
    },
    "correlation_id": {
      "type": "string",
      "format": "uuid"
    },
    "resource": {
      "type": "object",
      "required": ["type", "id"],
      "properties": {
        "type": {
          "type": "string",
          "enum": ["vaga", "candidato", "feedback", "task"]
        },
        "id": {
          "type": "string",
          "format": "uuid"
        }
      }
    },
    "actor": {
      "type": "object",
      "required": ["id", "type", "display_name"],
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "type": {
          "type": "string",
          "enum": ["user", "system"]
        },
        "display_name": {
          "type": "string"
        }
      }
    },
    "payload": {
      "type": "object"
    }
  }
}
```

### 12.2 Diagrama de Sequência

```
┌──────────┐          ┌─────────────────┐          ┌──────────────┐          ┌─────────────┐
│  Jestor  │          │ jestor-webhook  │          │   Supabase   │          │ audit_events│
└────┬─────┘          └───────┬─────────┘          └──────┬───────┘          └──────┬──────┘
     │                        │                           │                         │
     │ POST /jestor-webhook   │                           │                         │
     │───────────────────────►│                           │                         │
     │                        │                           │                         │
     │                        │ Valida Bearer Token       │                         │
     │                        │◄─────────────────────────►│                         │
     │                        │                           │                         │
     │                        │ Verifica correlation_id   │                         │
     │                        │──────────────────────────►│                         │
     │                        │                           │                         │
     │                        │ [Não duplicado]           │                         │
     │                        │ UPDATE recurso            │                         │
     │                        │──────────────────────────►│                         │
     │                        │                           │                         │
     │                        │ INSERT audit_event        │                         │
     │                        │─────────────────────────────────────────────────────►
     │                        │                           │                         │
     │ 200 OK                 │                           │                         │
     │◄───────────────────────│                           │                         │
     │                        │                           │                         │
```

### 12.3 Checklist de Integração

- [ ] Bearer Token configurado como secret
- [ ] Endpoint acessível externamente
- [ ] Tabelas com colunas de idempotência
- [ ] Triggers de visibilidade do cliente ativos
- [ ] RLS policies configuradas
- [ ] Logs de auditoria funcionando
- [ ] Testes de cada tipo de evento realizados
- [ ] Documentação revisada e aprovada

---

## Histórico de Versões

| Versão | Data | Autor | Alterações |
|--------|------|-------|------------|
| 1.0.0 | 2025-01-08 | Equipe rhello | Versão inicial |

---

> **Nota:** Esta documentação deve ser atualizada sempre que houver alterações na integração.
