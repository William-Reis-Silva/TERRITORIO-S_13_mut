# TERRITÓRIO S-13 — PLANNER COMPLETO
> Documento de referência único para desenvolvimento, regras de negócio, arquitetura de banco e padrões de frontend.
> **Versão:** 1.0.0 · **Última atualização:** 2025

---

## ÍNDICE

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Regras de Negócio](#2-regras-de-negócio)
3. [Fluxos Principais](#3-fluxos-principais)
4. [Arquitetura do Banco de Dados](#4-arquitetura-do-banco-de-dados)
5. [Row Level Security (RLS)](#5-row-level-security-rls)
6. [Funções e Triggers](#6-funções-e-triggers)
7. [Frontend — Design System](#7-frontend--design-system)
8. [Frontend — Páginas e Componentes](#8-frontend--páginas-e-componentes)
9. [Stack e Dependências](#9-stack-e-dependências)
10. [Checklist de Implementação](#10-checklist-de-implementação)

---

## 1. VISÃO GERAL DO SISTEMA

### O que é

O **Território S-13** é um PWA (Progressive Web App) multi-congregação para gerenciamento de territórios de pregação. Substitui o controle manual em papel pelo formulário S-13 digital, com histórico, mapas e controle de designações.

### Proposta de valor

| Problema (papel) | Solução (sistema) |
|---|---|
| Formulários S-13 físicos se perdem | Histórico digital persistente por congregação |
| Sem controle de quem tem qual mapa | Dashboard com status em tempo real |
| Cada congregação gere separado | Multi-congregação com isolamento total de dados |
| Admin desconhece territórios atrasados | Filtros por status e alertas visuais |

### Escopo v1.0

- [x] Cadastro de congregações com número oficial como chave
- [x] Sistema de aprovação de membros (pendente → ativo)
- [x] Gerenciamento de territórios e mapas por imagem
- [x] Registro de designações (formulário S-13)
- [x] Relatório anual por ano de serviço
- [x] PWA com suporte offline básico
- [ ] Notificações por e-mail (v1.1)
- [ ] App mobile nativo (v2.0)

---

## 2. REGRAS DE NEGÓCIO

### 2.1 Congregações

**RN-01 — Número como identificador único**
O número oficial da congregação (atribuído pela organização) é a chave primária. Não existe identificador gerado pelo sistema. Isso elimina duplicatas por nome e garante rastreabilidade.

```
VÁLIDO:   congregacao.id = 12345  (número oficial)
INVÁLIDO: gerar UUID ou auto-increment para congregação
```

**RN-02 — Imutabilidade do número**
O número da congregação nunca pode ser alterado após o cadastro. Se houver erro, o admin deve contatar o suporte para correção manual via banco.

**RN-03 — Campos obrigatórios no cadastro**
Toda congregação deve ter: número, nome, cidade, estado (UF). Circuito é opcional mas recomendado.

**RN-04 — Dados regionais**
Estado deve ser a sigla de 2 letras da UF brasileira (SP, RJ, MG, etc.). Cidade em texto livre, sem normalização forçada na v1.

---

### 2.2 Usuários e Papéis

**RN-05 — Primeiro usuário é admin automático**
O primeiro usuário a se cadastrar com um número de congregação se torna administrador automaticamente. Essa promoção é feita de forma atômica via `fn_registrar_congregacao` para evitar race conditions.

**RN-06 — Demais usuários entram como pendentes**
Qualquer usuário que se cadastre com um número de congregação já existente fica com papel `pendente` até aprovação explícita de um admin ou auxiliar.

**RN-07 — Hierarquia de papéis**

```
admin
  └─ Tudo: configurar congregação, aprovar/rejeitar,
           transferir admin, deletar registros, gerenciar mapas

auxiliar
  └─ Aprovar/rejeitar membros pendentes
     Criar, editar e concluir designações
     Gerenciar territórios (criar, editar)
     NÃO pode: alterar configurações da congregação,
               deletar congregação, transferir admin

membro
  └─ Ver todos os dados da congregação
     Criar novas designações
     Editar e concluir designações que ele mesmo criou
     NÃO pode: aprovar outros, criar territórios, deletar

pendente
  └─ Somente leitura do próprio perfil
     Vê: status da solicitação, motivo de rejeição (se houver)
     NÃO pode: ver dados da congregação

rejeitado
  └─ Sem acesso algum
     Pode reenviar solicitação de acesso
```

**RN-08 — Admin único por congregação**
Só pode existir um usuário com papel `admin` por congregação. Para transferir, o admin atual é rebaixado para `auxiliar` automaticamente.

**RN-09 — Admin não pode se auto-deletar**
O usuário com papel `admin` não pode excluir sua própria conta enquanto for admin. Deve transferir o papel antes.

**RN-10 — Motivo de rejeição é obrigatório**
Ao rejeitar um usuário, o admin deve informar um motivo (mínimo 10 caracteres). O motivo fica visível para o usuário rejeitado para que ele entenda o que aconteceu.

**RN-11 — Reenvio de solicitação**
Usuários com papel `rejeitado` podem reenviar a solicitação. Isso reseta o papel para `pendente` e cria novo log. O motivo anterior é mantido em `logs_atividade`.

**RN-12 — Admin inativo — proteção**
Se o único admin ficar mais de 90 dias sem acesso (`ultimo_acesso`), qualquer auxiliar pode assumir a administração. (Implementar na v1.1 via job agendado.)

---

### 2.3 Territórios

**RN-13 — Número único por congregação**
O `numero_mapa` é único dentro da congregação, não globalmente. Congregação A e B podem ter um mapa número 5 sem conflito.

**RN-14 — Tipos de território**
Cada território tem um tipo: `residencial`, `comercial`, `rural`, `especial`. Afeta filtros e relatórios, mas não altera regras de designação.

**RN-15 — Soft-delete de territórios**
Territórios não são deletados fisicamente. O campo `ativo = false` os oculta das listagens normais. O histórico de designações é preservado.

**RN-16 — Imagem do mapa (link externo opcional)**
O campo `territorios.imagem_url` armazena uma URL externa fornecida pelo próprio usuário — o sistema **não hospeda imagens**. O admin cola o link de onde já tiver a imagem publicada (Google Drive com visualização pública, Imgur, GitHub, servidor próprio, etc.). O campo é completamente opcional: territórios sem imagem funcionam normalmente. O sistema não faz upload, não valida formato e não controla o ciclo de vida da imagem — isso é responsabilidade de quem gerou o link. Essa decisão elimina custos de Storage e transferência no Supabase.

---

### 2.4 Designações

**RN-17 — Data de conclusão**
A data de conclusão é opcional no momento da criação. Quando preenchida, deve ser igual ou posterior à data de início. O trigger `trg_designacao_conclusao` muda o status para `concluido` automaticamente.

**RN-18 — Status da designação**

```
em_andamento  → Designação ativa, território em uso
concluido     → data_conclusao preenchida
devolvido     → Território devolvido sem trabalho (casos especiais)
```

**RN-19 — Território em uso**
Um território pode ter múltiplas designações simultâneas (grupos diferentes podem trabalhar em paralelo). Não há bloqueio de "território já designado".

**RN-20 — Ano de serviço**
O ano de serviço começa em 1 de setembro e termina em 31 de agosto do ano seguinte. Relatórios S-13 filtram por esse intervalo.

```
Ano 2024-2025: 01/09/2024 a 31/08/2025
```

**RN-21 — Máximo de designações por relatório**
O formulário S-13 oficial exibe até 4 designações por território por ano. O banco não limita, mas o relatório exibe apenas as 4 mais recentes do período.

---

### 2.5 Convites

**RN-22 — Validade do convite**
Convites expiram em 7 dias após a criação. Token gerado com 24 bytes aleatórios em base64 (praticamente impossível de adivinhar).

**RN-23 — Uso único**
Um convite só pode ser usado uma vez. Após uso, `usado = true` e `usado_por` é preenchido.

**RN-24 — Restrição por e-mail**
Opcionalmente, o admin pode restringir o convite a um endereço de e-mail específico. Se o usuário que usar o link tiver e-mail diferente, o acesso é negado.

**RN-25 — Papel do convite**
Admin pode criar convite para `membro` ou `auxiliar`. Não pode criar convite para `admin` — a promoção para admin só ocorre por transferência explícita.

---

### 2.6 Auditoria

**RN-26 — Log imutável**
A tabela `logs_atividade` é append-only. Nenhuma política RLS permite UPDATE ou DELETE. Isso garante trilha de auditoria confiável.

**RN-27 — Ações registradas obrigatoriamente**

| Ação | Quando |
|---|---|
| `criacao_congregacao` | Primeira congregação cadastrada |
| `solicitacao_acesso` | Usuário entra como pendente |
| `aprovacao_usuario` | Admin aprova membro |
| `rejeicao_usuario` | Admin rejeita membro |
| `troca_admin` | Transferência de administração |
| `uso_convite` | Convite utilizado |
| `criacao_designacao` | Nova designação criada |
| `conclusao_territorio` | Designação concluída |
| `alteracao_config` | Config da congregação alterada |

---

## 3. FLUXOS PRINCIPAIS

### 3.1 Fluxo de Cadastro

```
USUÁRIO ABRE /Cadastro.html
        │
        ▼
[Passo 1] Dados pessoais
  Nome, E-mail, Senha (≥6 chars)
        │
        ▼
[Passo 2] Dados da congregação
  Número, Nome, Cidade, Estado, Circuito
        │
        ▼
Cria conta no Supabase Auth
        │
        ▼
Chama fn_registrar_congregacao()
        │
        ├─── Congregação NÃO existe ──► Cria congregação + vira ADMIN
        │                                        │
        │                               Redireciona para /Painel/painel.html
        │
        └─── Congregação JÁ existe ──► Entra como PENDENTE
                                                │
                                        Mostra tela de espera
                                        com feedback visual
                                                │
                                        Admin recebe badge de
                                        notificação no painel
```

### 3.2 Fluxo de Aprovação

```
Admin acessa /Painel/painel.html
        │
        ▼
Badge vermelho indica usuários pendentes
        │
        ▼
Clica em "Usuários Pendentes"
        │
        ▼
Lista: nome, e-mail, data de solicitação, dias aguardando
        │
        ├── [Aprovar] ──► Escolhe papel (membro/auxiliar)
        │                  Chama fn_decidir_usuario('aprovar')
        │                  Log registrado
        │                  Usuário recebe acesso imediato
        │
        └── [Rejeitar] ──► Input: motivo obrigatório (≥10 chars)
                           Chama fn_decidir_usuario('rejeitar')
                           Log registrado
                           Usuário vê motivo na tela de espera
```

### 3.3 Fluxo de Designação

```
Usuário acessa /Registro_S13.html
        │
        ▼
Digita número do mapa
        │
        ▼
Sistema busca território (bairro, imagem)
        │
        ├── Encontrado ──► Pré-preenche bairro + mostra imagem
        │
        └── Não encontrado ──► Erro: "Mapa não cadastrado"
                                 Link para cadastrar território
        │
        ▼
Seleciona: Grupo/Publicador (lista da config)
Data início, Data conclusão (opcional)
        │
        ▼
Salva designação → Volta para /index.html
```

### 3.4 Fluxo de Relatório S-13

```
Admin/Auxiliar acessa /S_13.html
        │
        ▼
Seleciona ano de serviço (set/ago)
        │
        ▼
Query agrupa designações por território (até 4 por território)
        │
        ▼
Tabela renderizada ──► [Exportar PDF]
                              │
                              ▼
                       jsPDF + AutoTable
                       Layout do S-13 oficial
```

---

## 4. ARQUITETURA DO BANCO DE DADOS

### Visão Geral do Modelo

```
┌─────────────────┐       ┌─────────────────────┐
│   congregacoes  │◄──────│      usuarios       │
│  PK: id (INT)   │       │  PK: id (UUID Auth) │
│  nome           │       │  FK: congregacao_id │
│  cidade         │       │  papel              │
│  estado (UF)    │       │  status             │
│  circuito       │       │  aprovado_por       │
│  config (JSONB) │       └─────────────────────┘
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐       ┌─────────────────────┐
│   territorios   │◄──────│    designacoes      │
│  PK: id (UUID)  │       │  PK: id (UUID)      │
│  FK: cong_id    │       │  FK: cong_id        │
│  numero_mapa    │       │  FK: territorio_id  │
│  bairro         │       │  designado_para     │
│  tipo           │       │  data_inicio        │
│  imagem_url     │       │  data_conclusao     │
│  ativo          │       │  status             │
└─────────────────┘       └─────────────────────┘

┌─────────────────┐       ┌─────────────────────┐
│ logs_atividade  │       │      convites       │
│  PK: id (BIGINT)│       │  PK: id (UUID)      │
│  congregacao_id │       │  FK: cong_id        │
│  usuario_id     │       │  token (UNIQUE)     │
│  acao           │       │  papel_destino      │
│  entidade       │       │  email_destino      │
│  detalhes(JSONB)│       │  expira_em          │
└─────────────────┘       └─────────────────────┘
```

---

### 4.1 Tabela: `congregacoes`

```sql
CREATE TABLE public.congregacoes (
    id            INTEGER     PRIMARY KEY,   -- número oficial, imutável
    nome          TEXT        NOT NULL,
    cidade        TEXT        NOT NULL,
    estado        CHAR(2)     NOT NULL,      -- UF: SP, RJ, MG...
    circuito      TEXT,                      -- ex: "Circuito 10-B"
    config        JSONB       NOT NULL DEFAULT '{}',
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Campo `config` — estrutura esperada:**
```json
{
  "grupos": ["Congregação", "Grupo Norte", "Grupo Sul"],
  "max_territorios": 100,
  "permite_convites": true
}
```

**Índices:**
- `idx_congregacoes_estado` — filtragem por UF
- `idx_congregacoes_cidade` GIN trgm — busca textual por cidade

---

### 4.2 Tabela: `usuarios`

```sql
CREATE TABLE public.usuarios (
    id               UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    congregacao_id   INTEGER     NOT NULL REFERENCES congregacoes(id) ON DELETE RESTRICT,
    nome             TEXT        NOT NULL,
    email            TEXT        NOT NULL,
    papel            TEXT        NOT NULL DEFAULT 'pendente'
                     CHECK (papel IN ('admin','auxiliar','membro','pendente','rejeitado')),
    aprovado_por     UUID        REFERENCES usuarios(id) ON DELETE SET NULL,
    aprovado_em      TIMESTAMPTZ,
    motivo_rejeicao  TEXT,
    ultimo_acesso    TIMESTAMPTZ,
    criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Regras de papel:**

| Papel | Pode ver congregação | Pode criar | Pode aprovar | Admin |
|---|---|---|---|---|
| `admin` | ✅ | ✅ | ✅ | ✅ |
| `auxiliar` | ✅ | ✅ | ✅ | ❌ |
| `membro` | ✅ | ✅ | ❌ | ❌ |
| `pendente` | ❌ | ❌ | ❌ | ❌ |
| `rejeitado` | ❌ | ❌ | ❌ | ❌ |

**Índices:**
- `idx_usuarios_congregacao` — FK lookup
- `idx_usuarios_papel` — filtrar pendentes rapidamente
- `idx_usuarios_email` — busca por e-mail

---

### 4.3 Tabela: `territorios`

```sql
CREATE TABLE public.territorios (
    id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    congregacao_id INTEGER     NOT NULL REFERENCES congregacoes(id) ON DELETE CASCADE,
    numero_mapa    INTEGER     NOT NULL,
    bairro         TEXT        NOT NULL,
    descricao      TEXT,
    tipo           TEXT        NOT NULL DEFAULT 'residencial'
                   CHECK (tipo IN ('residencial','comercial','rural','especial')),
    imagem_url     TEXT,
    ativo          BOOLEAN     NOT NULL DEFAULT TRUE,
    criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (congregacao_id, numero_mapa)   -- único POR congregação
);
```

**Campo `imagem_url` — link externo opcional:**
```
Sem Storage no Supabase. Zero custo de hospedagem.

O usuário fornece qualquer URL pública que já possua:
  - Google Drive  (link de visualização pública)
  - Imgur
  - GitHub (raw)
  - Servidor próprio / CDN pessoal
  - Qualquer outro host de imagem público

Campo opcional — território sem imagem funciona normalmente.
O sistema apenas armazena a string e exibe via <img src="...">.
Não há validação de formato, tamanho ou disponibilidade do link.
```

**Índices:**
- `idx_territorios_congregacao`
- `idx_territorios_numero` (congregacao_id, numero_mapa)
- `idx_territorios_ativo` (congregacao_id, ativo)

---

### 4.4 Tabela: `designacoes`

```sql
CREATE TABLE public.designacoes (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    congregacao_id  INTEGER     NOT NULL REFERENCES congregacoes(id) ON DELETE CASCADE,
    territorio_id   UUID        NOT NULL REFERENCES territorios(id) ON DELETE CASCADE,
    designado_para  TEXT        NOT NULL,
    data_inicio     DATE        NOT NULL,
    data_conclusao  DATE,
    status          TEXT        NOT NULL DEFAULT 'em_andamento'
                    CHECK (status IN ('em_andamento','concluido','devolvido')),
    observacao      TEXT,
    criado_por      UUID        REFERENCES usuarios(id) ON DELETE SET NULL,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (data_conclusao IS NULL OR data_conclusao >= data_inicio)
);
```

**Índices:**
- `idx_designacoes_congregacao`
- `idx_designacoes_territorio`
- `idx_designacoes_status` (congregacao_id, status)
- `idx_designacoes_datas` (congregacao_id, data_inicio, data_conclusao)

---

### 4.5 Tabela: `logs_atividade`

```sql
CREATE TABLE public.logs_atividade (
    id             BIGSERIAL   PRIMARY KEY,
    congregacao_id INTEGER     REFERENCES congregacoes(id) ON DELETE SET NULL,
    usuario_id     UUID        REFERENCES usuarios(id) ON DELETE SET NULL,
    acao           TEXT        NOT NULL,
    entidade       TEXT,       -- tabela afetada
    entidade_id    TEXT,       -- PK do registro (TEXT aceita UUID e INT)
    detalhes       JSONB,      -- dados antes/depois, IPs, contexto
    criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Append-only:** nenhuma política permite UPDATE ou DELETE.

---

### 4.6 Tabela: `convites`

```sql
CREATE TABLE public.convites (
    id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    congregacao_id INTEGER     NOT NULL REFERENCES congregacoes(id) ON DELETE CASCADE,
    criado_por     UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    papel_destino  TEXT        NOT NULL DEFAULT 'membro'
                   CHECK (papel_destino IN ('auxiliar','membro')),
    token          TEXT        NOT NULL UNIQUE
                   DEFAULT encode(gen_random_bytes(24), 'base64'),
    email_destino  TEXT,       -- opcional: restringir a um e-mail
    usado          BOOLEAN     NOT NULL DEFAULT FALSE,
    usado_por      UUID        REFERENCES usuarios(id) ON DELETE SET NULL,
    expira_em      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 5. ROW LEVEL SECURITY (RLS)

### Princípio geral

> **Cada congregação enxerga APENAS seus próprios dados. Nenhuma query vaza entre congregações.**

Todas as políticas dependem de três funções helper:

```sql
fn_minha_congregacao() → INTEGER   -- congregacao_id do usuário logado
fn_meu_papel()         → TEXT      -- papel atual ('admin', 'membro', etc.)
fn_is_gestor()         → BOOLEAN   -- TRUE se admin ou auxiliar
```

---

### 5.1 Políticas: `congregacoes`

| Operação | Quem | Condição |
|---|---|---|
| `SELECT` | Qualquer autenticado | Sempre (necessário para verificar se número existe) |
| `INSERT` | Ninguém diretamente | Somente via `fn_registrar_congregacao` (SECURITY DEFINER) |
| `UPDATE` | Admin | `id = fn_minha_congregacao() AND papel = 'admin'` |
| `DELETE` | Ninguém | Bloqueado |

---

### 5.2 Políticas: `usuarios`

| Operação | Quem | Condição |
|---|---|---|
| `SELECT` | Membro ativo | `congregacao_id = fn_minha_congregacao() AND papel IN ('admin','auxiliar','membro')` |
| `SELECT` | Pendente/Rejeitado | Somente `id = auth.uid()` (próprio perfil) |
| `INSERT` | Ninguém diretamente | Via `fn_registrar_congregacao` ou `fn_usar_convite` |
| `UPDATE` | Gestor | Qualquer membro da congregação |
| `UPDATE` | Próprio usuário | Apenas campos pessoais (nome) — não papel |
| `DELETE` | Admin | Membros da congregação, exceto ele mesmo |

---

### 5.3 Políticas: `territorios`

| Operação | Quem | Condição |
|---|---|---|
| `SELECT` | Membro ativo | `congregacao_id = fn_minha_congregacao()` |
| `INSERT` | Gestor | `congregacao_id = fn_minha_congregacao()` |
| `UPDATE` | Gestor | `congregacao_id = fn_minha_congregacao()` |
| `DELETE` | Admin | `congregacao_id = fn_minha_congregacao()` |

---

### 5.4 Políticas: `designacoes`

| Operação | Quem | Condição |
|---|---|---|
| `SELECT` | Membro ativo | `congregacao_id = fn_minha_congregacao()` |
| `INSERT` | Membro ativo | `congregacao_id = fn_minha_congregacao()` |
| `UPDATE` | Gestor | Qualquer designação da congregação |
| `UPDATE` | Membro | Somente `criado_por = auth.uid()` |
| `DELETE` | Gestor | `congregacao_id = fn_minha_congregacao()` |

---

### 5.5 Políticas: `logs_atividade`

| Operação | Quem | Condição |
|---|---|---|
| `SELECT` | Gestor | `congregacao_id = fn_minha_congregacao()` |
| `INSERT` | Ninguém diretamente | Via funções SECURITY DEFINER |
| `UPDATE` | Ninguém | Bloqueado |
| `DELETE` | Ninguém | Bloqueado |

---

### 5.6 Políticas: `convites`

| Operação | Quem | Condição |
|---|---|---|
| `SELECT` | Gestor | `congregacao_id = fn_minha_congregacao()` |
| `INSERT` | Gestor | `congregacao_id = fn_minha_congregacao()` |
| `UPDATE` | Ninguém diretamente | Via `fn_usar_convite` (SECURITY DEFINER) |
| `DELETE` | Gestor | Convites não usados da própria congregação |

---

## 6. FUNÇÕES E TRIGGERS

### 6.1 Funções de contexto (usadas pelo RLS)

```sql
-- Retorna congregacao_id do usuário logado
fn_minha_congregacao() → INTEGER

-- Retorna papel do usuário logado
fn_meu_papel() → TEXT

-- TRUE se o usuário é admin ou auxiliar
fn_is_gestor() → BOOLEAN
```

### 6.2 Funções de negócio

```sql
-- Registra congregação OU solicita acesso (primeira chamada no cadastro)
fn_registrar_congregacao(
    p_congregacao_id  INTEGER,
    p_nome            TEXT,
    p_cidade          TEXT,
    p_estado          CHAR(2),
    p_circuito        TEXT,
    p_usuario_nome    TEXT,
    p_usuario_email   TEXT
) → JSONB
-- Retorna: { status: 'admin'|'pendente', mensagem: '...' }

-- Aprovar ou rejeitar usuário pendente
fn_decidir_usuario(
    p_usuario_id  UUID,
    p_decisao     TEXT,   -- 'aprovar' | 'rejeitar'
    p_papel       TEXT,   -- 'membro' | 'auxiliar'
    p_motivo      TEXT    -- obrigatório ao rejeitar
) → JSONB

-- Transfere admin para outro membro (admin atual vira auxiliar)
fn_transferir_admin(p_novo_admin_id UUID) → JSONB

-- Usa token de convite para entrar na congregação
fn_usar_convite(
    p_token          TEXT,
    p_usuario_nome   TEXT,
    p_usuario_email  TEXT
) → JSONB

-- Registra evento no log de auditoria
fn_registrar_log(
    p_congregacao_id  INTEGER,
    p_usuario_id      UUID,
    p_acao            TEXT,
    p_entidade        TEXT,
    p_entidade_id     TEXT,
    p_detalhes        JSONB
) → VOID
```

### 6.3 Triggers

| Trigger | Tabela | Quando | O que faz |
|---|---|---|---|
| `trg_*_atualizado` | Todas | BEFORE UPDATE | Atualiza `atualizado_em` |
| `trg_designacao_conclusao` | `designacoes` | BEFORE UPDATE | Se `data_conclusao` preenchida → `status = 'concluido'` |

---

## 7. FRONTEND — DESIGN SYSTEM

### 7.1 Estética

**Estilo:** Dark SaaS Premium
**Referências visuais:** Linear, Vercel, Railway
**Característica:** Superfícies em camadas escuras, bordas sutis, transições suaves, sem sombras grossas ou estilo brutalista.

---

### 7.2 Tipografia

```css
/* Importar via Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

--font-display: 'Outfit', sans-serif;       /* Títulos, H1-H4, logo */
--font-body:    'Plus Jakarta Sans', sans-serif; /* Corpo, labels, botões */
--font-mono:    'JetBrains Mono', monospace; /* Dados técnicos, badges, código */
```

**Escala tipográfica:**

| Elemento | Fonte | Tamanho | Peso |
|---|---|---|---|
| H1 | Outfit | clamp(1.75rem, 4vw, 2.75rem) | 800 |
| H2 | Outfit | clamp(1.3rem, 2.5vw, 1.9rem) | 700 |
| H3 | Outfit | 1.1rem | 600 |
| Corpo | Plus Jakarta Sans | 0.9rem | 400 |
| Label | Plus Jakarta Sans | 0.75rem | 600 |
| Mono / Badge | JetBrains Mono | 0.72–0.82rem | 400–500 |

---

### 7.3 Paleta de Cores

```css
/* Fundos em camadas */
--bg-root:       #080A0F;   /* Fundo base da página */
--bg-surface:    #0F1117;   /* Cards, tabelas */
--bg-elevated:   #161820;   /* Headers de card, inputs */
--bg-hover:      #1E2030;   /* Estado hover */
--bg-overlay:    rgba(8, 10, 15, 0.85); /* Modais backdrop */

/* Bordas */
--border:        rgba(255, 255, 255, 0.07);   /* Default */
--border-hover:  rgba(255, 255, 255, 0.14);   /* Hover */
--border-focus:  rgba(232, 64, 28, 0.6);      /* Foco de input */

/* Texto */
--text-primary:  #ECEEF5;   /* Texto principal */
--text-secondary:#9395A5;   /* Texto secundário, labels */
--text-disabled: #4A4C5E;   /* Placeholders, desabilitado */

/* Acento — vermelho S-13 */
--accent:        #E8401C;
--accent-hover:  #FF5530;
--accent-dim:    rgba(232, 64, 28, 0.12);  /* Fundo de badge/chip */
--accent-glow:   rgba(232, 64, 28, 0.25); /* Shadow de botão primary */

/* Semânticas */
--success:       #22C55E;
--success-dim:   rgba(34, 197, 94, 0.12);
--warning:       #F59E0B;
--warning-dim:   rgba(245, 158, 11, 0.12);
--error:         #EF4444;
--error-dim:     rgba(239, 68, 68, 0.12);
--info:          #3B82F6;
--info-dim:      rgba(59, 130, 246, 0.12);
```

---

### 7.4 Sombras e Raios

```css
/* Sombras */
--shadow-sm:     0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3);
--shadow-md:     0 4px 16px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.3);
--shadow-lg:     0 12px 40px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4);
--shadow-accent: 0 0 0 3px var(--accent-glow);

/* Border Radius */
--radius-sm:     6px;    /* Botões, inputs, badges */
--radius:        10px;   /* Cards menores */
--radius-lg:     14px;   /* Tabelas, wrappers */
--radius-xl:     20px;   /* Cards principais, modais */
--radius-full:   9999px; /* Chips, status indicators */
```

---

### 7.5 Componentes — Especificação

#### Botões

```css
/* Base — todos os botões */
padding: 0.65rem 1.25rem;
font-family: var(--font-body);
font-size: 0.875rem;
font-weight: 600;
border-radius: var(--radius-sm);
transition: all 180ms cubic-bezier(0.16, 1, 0.3, 1);

/* Variantes */
.btn-primary  → background: var(--accent); border: var(--accent); color: white
.btn-ghost    → background: transparent; border: transparent; color: var(--text-secondary)
.btn-danger   → background: var(--error-dim); border: error 25%; color: var(--error)
               hover → background: var(--error); color: white
.btn-default  → background: var(--bg-elevated); border: var(--border); color: var(--text-primary)

/* Hover em todos */
transform: nenhum (sem deslocamento)
box-shadow: leve para btn-primary
opacity: não usar para hover — usar mudança de background

/* Ativo/click */
transform: scale(0.985)
```

#### Inputs

```css
padding: 0.65rem 0.875rem;
background: var(--bg-elevated);
border: 1px solid var(--border);
border-radius: var(--radius-sm);
font-size: 0.875rem;
color: var(--text-primary);

/* Focus */
border-color: var(--accent);
box-shadow: 0 0 0 3px var(--accent-glow);
background: var(--bg-hover);

/* Hover */
border-color: var(--border-hover);
background: var(--bg-hover);

/* Placeholder */
color: var(--text-disabled);
font-size: 0.85rem;
```

#### Cards

```css
/* Card padrão */
background: var(--bg-surface);
border: 1px solid var(--border);
border-radius: var(--radius-xl);
padding: 1.5rem;

/* Card elevado (modais, cadastro) */
background: var(--bg-elevated);
border: 1px solid var(--border-hover);
box-shadow: var(--shadow-lg);
border-radius: var(--radius-xl);
```

#### Tabelas

```css
/* Wrapper */
border: 1px solid var(--border);
border-radius: var(--radius-lg);
background: var(--bg-surface);

/* Header */
background: var(--bg-elevated);
color: var(--text-secondary);
font-size: 0.72rem; font-weight: 600;
text-transform: uppercase; letter-spacing: 0.05em;

/* Linha */
border-bottom: 1px solid var(--border);
hover → background: var(--bg-elevated)

/* Célula */
padding: 0.85rem 1rem;
```

#### Badges de Status

```css
/* Estrutura */
display: inline-flex; align-items: center; gap: 0.3rem;
padding: 0.2rem 0.6rem;
border-radius: var(--radius-full);
font-size: 0.72rem; font-weight: 600;

/* Ponto indicador via ::before */
content: ''; width: 5px; height: 5px;
border-radius: 50%; background: currentColor;

/* Variantes */
.badge-active   → success-dim / success
.badge-pending  → warning-dim / warning
.badge-done     → bg-hover / text-secondary
.badge-accent   → accent-dim / accent
```

#### Header (site-header)

```css
position: sticky; top: 0; z-index: 100;
height: 56px;
background: rgba(8, 10, 15, 0.8);
border-bottom: 1px solid var(--border);
backdrop-filter: blur(12px);
```

#### Modal

```css
/* Overlay */
background: rgba(8, 10, 15, 0.85);
backdrop-filter: blur(4px);

/* Box */
background: var(--bg-elevated);
border: 1px solid var(--border-hover);
border-radius: var(--radius-xl);
box-shadow: var(--shadow-lg);
max-width: 500px;
padding: 1.75rem;

/* Animação de entrada */
@keyframes modalIn {
  from { opacity: 0; transform: translateY(10px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
```

#### Animações de Entrada

```css
/* Reveal base */
.reveal {
  opacity: 0;
  transform: translateY(14px);
  animation: revealUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/* Stagger */
.stagger-1 { animation-delay: 0.05s; }
.stagger-2 { animation-delay: 0.12s; }
.stagger-3 { animation-delay: 0.20s; }
.stagger-4 { animation-delay: 0.28s; }
```

---

### 7.6 Regras de Design — NÃO FAZER

```
❌ Bordas grossas (2px+ sólidas em preto)
❌ Sombras deslocadas estilo brutalista (box-shadow: 6px 6px 0 black)
❌ Fontes genéricas: Inter, Roboto, Arial, system-ui
❌ Gradientes purple/blue clichês em fundo branco
❌ Texto em maiúsculas em corpo de conteúdo (só em labels/badges)
❌ transform: translate(-2px, -2px) em hover de botões
❌ Fundo branco ou claro — o sistema é dark mode obrigatório
❌ Cores fixas em hex dentro de componentes (usar sempre variáveis CSS)
❌ Emoji como ícones de navegação ou status (usar Font Awesome ou SVG)
❌ Border-radius zero em elementos interativos (inputs, botões, cards)
```

---

## 8. FRONTEND — PÁGINAS E COMPONENTES

### 8.1 Mapa de Páginas

```
/
├── login.html              → Tela de acesso
├── Cadastro.html           → Cadastro em 2 passos
├── index.html              → Dashboard — últimos registros
├── Registro_S13.html       → Formulário de nova designação
├── S_13.html               → Relatório anual S-13
├── Painel/
│   └── painel.html         → Admin: usuários, config, convites
└── Territorio/
    ├── index_territorio.html → Lista de territórios
    ├── Mapa.html             → Visualização de mapas
    ├── tabela.html           → Tabela detalhada
    └── especial.html         → Territórios especiais
```

---

### 8.2 `login.html`

**Layout:** Grid 2 colunas (visual | formulário)
**Visual side:** fundo `bg-dark`, grade decorativa SVG, brilho radial vermelho, headline grande, stats (S-13, PWA, Versão)
**Form side:** fundo `bg-root`, logo topo, eyebrow, título "Entrar", inputs, botão primary, links de navegação

**Lógica JS:**
```javascript
// Verificar se já está logado → redirecionar para index.html
supabase.auth.onAuthStateChange((event, session) => {
    if (session) window.location.href = 'index.html';
});

// Submit
supabase.auth.signInWithPassword({ email, password })
// Sucesso → index.html
// Erro → mostrar error-box com mensagem amigável
```

**Responsivo:** Abaixo de 900px, visual-side some (`display:none`), form-side ocupa 100%.

---

### 8.3 `Cadastro.html`

**Layout:** Centralizado, max-width 480px, card com `border-radius: var(--radius-xl)`
**Passos:** Step track (2 barras) + formulário em 2 etapas

**Passo 1 — Identificação:**
- Nome completo
- E-mail
- Senha (≥ 6 chars)
- Confirmar senha
- Validação client-side antes de avançar

**Passo 2 — Congregação:**
- Número da congregação (obrigatório)
- Nome da congregação
- Cidade
- Estado (select com UFs)
- Circuito (opcional)

**Verificação do número:**
Ao sair do campo número (blur), consultar se congregação existe e mostrar feedback:
- Congregação encontrada → "Você solicitará acesso a [Nome]. Aguardará aprovação do admin."
- Congregação nova → "Você será o primeiro administrador."

**Submit:**
1. Criar usuário no Supabase Auth
2. Chamar `fn_registrar_congregacao` via RPC
3. Se `status === 'admin'` → redirecionar para `/Painel/painel.html`
4. Se `status === 'pendente'` → mostrar tela de espera

**Tela de espera (pendente):**
```html
<!-- Mostrar em vez do formulário quando status = pendente -->
Ícone de relógio
"Sua solicitação foi enviada"
"Aguardando aprovação do administrador da [Nome da Congregação]"
"Você será notificado assim que tiver acesso."
[Sair] → logout + voltar para login
```

---

### 8.4 `index.html`

**Componentes:**
- Header com chip de usuário online + badge de pendentes (admin)
- Toolbar: título, status de conexão, botão "Novo Registro"
- Tabela com colunas: Mapa, Bairro, Designado Para, Data Início, Conclusão, Status, Ações
- Modal de edição (campos: data início, data conclusão)
- Botão deletar no modal com confirmação

**Dados carregados:**
```javascript
// Query D1 do arquivo queries.sql
supabase.from('designacoes')
    .select('*, territorios(numero_mapa, bairro)')
    .eq('congregacao_id', congregacaoId)
    .order('criado_em', { ascending: false })
    .limit(50)
```

**Status visual:**
```
em_andamento → badge-pending (amarelo)
concluido    → badge-done (cinza)
devolvido    → badge com ícone específico
```

---

### 8.5 `Registro_S13.html`

**Componentes:**
- Header com voltar
- Card com header escuro (título + badge S-13)
- Banner do usuário logado
- Formulário: número mapa, bairro (readonly), preview imagem, select grupo, data início, data conclusão
- Dialog de confirmação após salvar

**Comportamento do campo número:**
```javascript
// Debounce 500ms após digitar
async function onNumeroChange(numero) {
    const { data } = await supabase
        .from('territorios')
        .select('bairro, imagem_url')
        .eq('congregacao_id', congregacaoId)
        .eq('numero_mapa', numero)
        .single();

    if (data) {
        document.getElementById('bairro').value = data.bairro;
        // Mostrar imagem se imagem_url existir (link externo — pode falhar se URL inválida)
        // Tratar onerror: ocultar preview e mostrar mensagem "imagem indisponível"
    } else {
        // Mostrar erro: "Território não cadastrado"
    }
}
```

---

### 8.6 `S_13.html`

**Componentes:**
- Header
- Controle de ano (bloco compacto prev/label/next)
- Botão exportar PDF
- Tabela S-13 (duas linhas de cabeçalho, até 4 designações por mapa)

**Cálculo do ano de serviço:**
```javascript
function calcularAnoServico(ano) {
    return {
        inicio: new Date(`${ano - 1}-09-01`),
        fim:    new Date(`${ano}-08-31`)
    };
}
// Ex: ano=2025 → 01/09/2024 a 31/08/2025
```

---

### 8.7 `Painel/painel.html` ✅ Implementado

**Acesso:** somente `admin` e `auxiliar`. Qualquer outro papel é redirecionado para `index.html`.

**Layout:** header fixo + sidebar lateral (220px) + área de conteúdo. Em mobile, sidebar vira barra horizontal rolável no topo.

---

#### Sidebar — navegação entre seções

| Item | Ícone | Visível para |
|---|---|---|
| Visão Geral | `chart-line` | admin + auxiliar |
| Pendentes | `user-clock` + badge vermelho | admin + auxiliar |
| Membros | `users` | admin + auxiliar |
| Convites | `link` | admin + auxiliar |
| Congregação | `sliders-h` | admin + auxiliar |
| Auditoria | `history` | admin + auxiliar |

O badge de pendentes atualiza em tempo real via **Supabase Realtime** (canal `admin-pendentes`, evento INSERT na tabela `usuarios`).

---

#### Seção 1 — Visão Geral

4 cards de estatísticas carregados em paralelo via `Promise.all`:

| Card | Query | Destaque |
|---|---|---|
| Membros Ativos | COUNT papéis admin+auxiliar+membro | neutro |
| Aguardando Aprovação | COUNT papel=pendente | vermelho (accent) |
| Territórios | COUNT ativo=true | neutro |
| Em Andamento | COUNT status=em_andamento | neutro |

Abaixo dos cards: **5 atividades recentes** do log de auditoria (preview do log completo).

---

#### Seção 2 — Pendentes

Lista cada solicitação com:
- Avatar gerado por iniciais do nome
- Nome + e-mail
- Chip "X dias" — fica **vermelho** quando `dias >= 3`
- Três ações inline: **Aprovar como Membro**, **Aprovar como Auxiliar**, **Rejeitar**

**Rejeitar** abre modal com:
- Textarea para o motivo
- Validação: mínimo 10 caracteres (obrigatório por RN-10)
- Chama `fn_decidir_usuario('rejeitar')`

**Aprovar** chama `fn_decidir_usuario('aprovar', papel)` diretamente, sem modal.

Após qualquer decisão: recarrega pendentes, membros e estatísticas.

---

#### Seção 3 — Membros

Tabela com colunas: Usuário (avatar + nome + email), Papel (badge colorido), Membro desde, Último acesso, Ações.

**Badges de papel:**

| Papel | Cor | Ícone |
|---|---|---|
| `admin` | vermelho (accent) | crown |
| `auxiliar` | azul (info) | star |
| `membro` | cinza | user |
| `pendente` | amarelo (warning) | clock |
| `rejeitado` | vermelho (error) | ban |

**Ações disponíveis** (somente admin, exceto no próprio perfil):
- **Papel** → abre modal para alterar entre `membro` e `auxiliar`
- **Remover** → `confirm()` nativo + DELETE na tabela `usuarios`

---

#### Seção 4 — Convites

Cards por convite com estado visual:
- **Ativo** → badge verde, link copiável, botão cancelar
- **Usado** → opacidade reduzida, badge "Usado"
- **Expirado** → opacidade reduzida, badge vermelho "Expirado"

**Copiar link:** clique no token ou no botão "Copiar Link" usa `navigator.clipboard.writeText`. O botão muda para "Copiado!" por 2s.

**Novo Convite** (modal):
- Select de papel: `membro` ou `auxiliar` (não cria convite para admin — RN-25)
- E-mail opcional para restringir o convite (RN-24)
- INSERT direto na tabela `convites` — token e expiração preenchidos por DEFAULT no banco

**Cancelar:** DELETE onde `usado = false`.

---

#### Seção 5 — Configurações

**Card: Dados da Congregação**
Grid 2 colunas: Nome, Circuito (opcional), Cidade, Estado (select com todas as 27 UFs).
Salva via UPDATE em `congregacoes` + atualiza `config.grupos`.

**Card: Grupos de Designação**
Lista dinâmica dos grupos do `config.grupos` JSONB.
- Cada item tem botão `×` para remover
- Input + botão "Adicionar" (também responde ao Enter)
- Valida duplicata antes de adicionar
- Estado mantido em `state.grupos` (array JS), persistido apenas ao clicar "Salvar Alterações"

**Card: Zona de Perigo** (visível apenas para `admin`)
- Select com membros ativos (membro + auxiliar) para ser o novo admin
- Botão "Transferir Admin" → abre modal de confirmação em 2 etapas
- Modal exibe o nome do novo admin e alerta sobre irreversibilidade
- Chama `fn_transferir_admin(p_novo_admin_id)` via RPC
- Após sucesso: toast + `window.location.reload()` após 1.5s (admin foi rebaixado)

---

#### Seção 6 — Auditoria

Lista das últimas **100 ações** da congregação, em ordem decrescente.

Cada item exibe: data/hora, badge da ação (cor por categoria), nome do autor.

**Cores por categoria de ação:**

| Ação | Cor |
|---|---|
| `criacao_congregacao`, `aprovacao_usuario` | verde (success) |
| `rejeicao_usuario` | vermelho (error) |
| `solicitacao_acesso` | amarelo (warning) |
| `troca_admin`, `uso_convite` | azul (info) |
| `alteracao_config` | laranja (accent) |

---

#### Modais disponíveis

| ID | Disparado por | Ação confirmada |
|---|---|---|
| `modal-rejeitar` | Botão "Rejeitar" nos pendentes | `fn_decidir_usuario('rejeitar')` |
| `modal-convite` | Botão "Novo Convite" | INSERT em `convites` |
| `modal-transferir` | Botão "Transferir Admin" | `fn_transferir_admin()` |
| `modal-papel` | Botão "Papel" nos membros | UPDATE `usuarios.papel` |

Todos fecham com ESC e com clique fora da caixa (listener no overlay).

---

#### Toasts

Sistema de notificação não-intrusivo no canto inferior direito.
Auto-remove após 3.5s com fade-out.

| Tipo | Ícone | Uso |
|---|---|---|
| `success` | `fa-check-circle` verde | Aprovação, salvamento, cópia |
| `error` | `fa-exclamation-circle` vermelho | Erros de operação |
| `info` | `fa-info-circle` | Notificação de novo pendente (Realtime) |

---

#### Estado global (`state`)

```javascript
const state = {
    congregacaoId: null,   // INTEGER — carregado no init
    adminId:       null,   // UUID — auth.uid()
    adminPapel:    null,   // 'admin' | 'auxiliar'
    usuarioAlvoId: null,   // UUID — preenchido antes de abrir modais
    usuarioAlvoNome: null, // String — para exibir no modal
    grupos: [],            // Array<string> — grupos de designação em edição
};
```

---

## 9. STACK E DEPENDÊNCIAS

### Backend
| Item | Detalhe |
|---|---|
| Plataforma | Supabase (PostgreSQL 15+) |
| Auth | Supabase Auth (email/senha) |
| Storage | ~~Supabase Storage~~ — **não utilizado** (imagens via link externo) |
| Realtime | Supabase Realtime (notificação de pendentes) |

### Frontend
| Item | Versão | Uso |
|---|---|---|
| Supabase JS | `@supabase/supabase-js@2` | SDK cliente |
| Font Awesome | `6.0.0` | Ícones |
| jsPDF | `2.3.1` | Geração de PDF |
| jsPDF AutoTable | `3.5.13` | Tabela no PDF |
| Google Fonts | Outfit + Plus Jakarta Sans + JetBrains Mono | Tipografia |

### PWA
| Item | Detalhe |
|---|---|
| Service Worker | `sw.js` (cache v2) |
| Manifest | `manifest.json` |
| Ícones | 192x192 e 512x512 (PNG) |
| Offline | Páginas estáticas cacheadas |

---

## 10. CHECKLIST DE IMPLEMENTAÇÃO

### Banco de Dados
- [ ] Executar `schema.sql` completo no Supabase SQL Editor
- [ ] Verificar extensões: `uuid-ossp`, `pg_trgm`
- [ ] Confirmar que RLS está ativo em todas as 6 tabelas
- [ ] Testar `fn_registrar_congregacao` com número novo → retorna `admin`
- [ ] Testar `fn_registrar_congregacao` com número existente → retorna `pendente`
- [ ] Testar `fn_decidir_usuario` como admin → aprova e rejeita
- [ ] Testar `fn_transferir_admin` → rebaixa admin atual, promove novo
- [ ] Configurar Realtime na tabela `usuarios` (INSERT events)

### Frontend — Autenticação
- [ ] `login.html` — redirect se já logado
- [ ] `login.html` — erro amigável para email não confirmado
- [ ] `Cadastro.html` — verificação de número ao sair do campo (blur)
- [ ] `Cadastro.html` — feedback visual: congregação nova vs. existente
- [ ] `Cadastro.html` — tela de espera para usuários pendentes
- [ ] Todas as páginas — verificar `papel` antes de renderizar conteúdo

### Frontend — Fluxo de Aprovação
- [ ] `index.html` — badge contador de pendentes (só para admin/auxiliar)
- [x] `painel.html` — lista de pendentes com dias aguardando ✅
- [x] `painel.html` — modal de rejeição com motivo obrigatório ✅
- [x] `painel.html` — Realtime: badge atualiza sem recarregar ✅

### Frontend — Designações
- [ ] `Registro_S13.html` — debounce no campo número do mapa
- [ ] `Registro_S13.html` — pré-visualização de imagem via link externo (tratar `onerror`)
- [ ] `Registro_S13.html` — select de grupos carregado da `config` da congregação
- [ ] `index.html` — modal de edição funcional
- [ ] `index.html` — confirmação antes de deletar
- [ ] `S_13.html` — cálculo correto de ano de serviço (set–ago)
- [ ] `S_13.html` — PDF com layout fiel ao formulário oficial

### Frontend — Admin
- [x] `painel.html` — visão geral com 4 cards de estatísticas ✅
- [x] `painel.html` — gestão de pendentes (aprovar membro/auxiliar, rejeitar) ✅
- [x] `painel.html` — gestão de membros (alterar papel, remover) ✅
- [x] `painel.html` — gestão de convites (criar, listar, copiar link, cancelar) ✅
- [x] `painel.html` — edição de dados da congregação ✅
- [x] `painel.html` — edição de grupos de designação (dinâmico) ✅
- [x] `painel.html` — transferência de admin com confirmação em 2 etapas ✅
- [x] `painel.html` — log de atividades (últimas 100 ações com cores) ✅
- [x] `painel.html` — sistema de toasts para feedback de ações ✅
- [x] `painel.html` — Realtime: notificação de novo pendente ✅

### Design System
- [ ] `css/design-system.css` aplicado em todas as páginas
- [ ] Fontes carregando via Google Fonts
- [ ] Variáveis CSS usadas — sem hex hardcoded em componentes
- [ ] Responsivo testado em 375px, 768px, 1024px
- [ ] Estados de loading em todos os botões assíncronos
- [ ] Mensagens de erro exibidas dentro do formulário (não alert())
- [ ] Modais fecham com ESC e clique fora

---

*Documento gerado para o projeto Território S-13. Atualizar este arquivo a cada decisão de arquitetura ou mudança de regra de negócio.*
