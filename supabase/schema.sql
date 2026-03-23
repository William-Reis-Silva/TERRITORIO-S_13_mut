-- ================================================================
--  TERRITÓRIO S-13 — SCHEMA COMPLETO
--  Executar no Supabase SQL Editor (Dashboard → SQL Editor)
--  Versão: 1.0.0
-- ================================================================

-- ── EXTENSÕES ────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ================================================================
--  LIMPEZA — Drop das tabelas antigas (schema anterior era TEXT)
--  CASCADE remove dependências na ordem correta
-- ================================================================
DROP TABLE IF EXISTS public.convites          CASCADE;
DROP TABLE IF EXISTS public.logs_atividade    CASCADE;
DROP TABLE IF EXISTS public.designacoes       CASCADE;
DROP TABLE IF EXISTS public.territorios       CASCADE;
DROP TABLE IF EXISTS public.usuarios          CASCADE;
DROP TABLE IF EXISTS public.congregacoes      CASCADE;

-- Drop de triggers de auth (trigger automático do Supabase que insere em public.usuarios)
-- Este trigger causa "Database error saving new user" porque congregacao_id é NOT NULL
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user()         CASCADE;

-- Drop de funções antigas se existirem
DROP FUNCTION IF EXISTS public.fn_minha_congregacao()   CASCADE;
DROP FUNCTION IF EXISTS public.fn_meu_papel()            CASCADE;
DROP FUNCTION IF EXISTS public.fn_is_gestor()            CASCADE;
DROP FUNCTION IF EXISTS public.fn_registrar_congregacao  CASCADE;
DROP FUNCTION IF EXISTS public.fn_decidir_usuario        CASCADE;
DROP FUNCTION IF EXISTS public.fn_transferir_admin       CASCADE;
DROP FUNCTION IF EXISTS public.fn_usar_convite           CASCADE;
DROP FUNCTION IF EXISTS public.fn_registrar_log          CASCADE;
DROP FUNCTION IF EXISTS public.fn_set_atualizado_em()    CASCADE;
DROP FUNCTION IF EXISTS public.fn_designacao_conclusao() CASCADE;

-- ================================================================
--  TABELAS
-- ================================================================

-- ── 1. CONGREGAÇÕES ──────────────────────────────────────────────
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

-- ── 2. USUÁRIOS ──────────────────────────────────────────────────
CREATE TABLE public.usuarios (
    id               UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    congregacao_id   INTEGER     NOT NULL REFERENCES public.congregacoes(id) ON DELETE RESTRICT,
    nome             TEXT        NOT NULL,
    email            TEXT        NOT NULL,
    papel            TEXT        NOT NULL DEFAULT 'pendente'
                     CHECK (papel IN ('admin','auxiliar','membro','pendente','rejeitado')),
    aprovado_por     UUID        REFERENCES public.usuarios(id) ON DELETE SET NULL,
    aprovado_em      TIMESTAMPTZ,
    motivo_rejeicao  TEXT,
    ultimo_acesso    TIMESTAMPTZ,
    criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. TERRITÓRIOS ───────────────────────────────────────────────
CREATE TABLE public.territorios (
    id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    congregacao_id INTEGER     NOT NULL REFERENCES public.congregacoes(id) ON DELETE CASCADE,
    numero_mapa    INTEGER     NOT NULL,
    bairro         TEXT        NOT NULL,
    descricao      TEXT,
    tipo           TEXT        NOT NULL DEFAULT 'residencial'
                   CHECK (tipo IN ('residencial','comercial','rural','especial')),
    imagem_url     TEXT,       -- URL externa opcional (sem Storage no Supabase)
    ativo          BOOLEAN     NOT NULL DEFAULT TRUE,
    criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (congregacao_id, numero_mapa)
);

-- ── 4. DESIGNAÇÕES ───────────────────────────────────────────────
CREATE TABLE public.designacoes (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    congregacao_id  INTEGER     NOT NULL REFERENCES public.congregacoes(id) ON DELETE CASCADE,
    territorio_id   UUID        NOT NULL REFERENCES public.territorios(id) ON DELETE CASCADE,
    designado_para  TEXT        NOT NULL,
    data_inicio     DATE        NOT NULL,
    data_conclusao  DATE,
    status          TEXT        NOT NULL DEFAULT 'em_andamento'
                    CHECK (status IN ('em_andamento','concluido','devolvido')),
    observacao      TEXT,
    criado_por      UUID        REFERENCES public.usuarios(id) ON DELETE SET NULL,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (data_conclusao IS NULL OR data_conclusao >= data_inicio)
);

-- ── 5. LOGS DE ATIVIDADE ─────────────────────────────────────────
CREATE TABLE public.logs_atividade (
    id             BIGSERIAL   PRIMARY KEY,
    congregacao_id INTEGER     REFERENCES public.congregacoes(id) ON DELETE SET NULL,
    usuario_id     UUID        REFERENCES public.usuarios(id) ON DELETE SET NULL,
    acao           TEXT        NOT NULL,
    entidade       TEXT,
    entidade_id    TEXT,       -- TEXT aceita UUID e INT
    detalhes       JSONB,
    criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 6. CONVITES ──────────────────────────────────────────────────
CREATE TABLE public.convites (
    id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    congregacao_id INTEGER     NOT NULL REFERENCES public.congregacoes(id) ON DELETE CASCADE,
    criado_por     UUID        NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    papel_destino  TEXT        NOT NULL DEFAULT 'membro'
                   CHECK (papel_destino IN ('auxiliar','membro')),
    token          TEXT        NOT NULL UNIQUE
                   DEFAULT encode(gen_random_bytes(24), 'base64'),
    email_destino  TEXT,
    usado          BOOLEAN     NOT NULL DEFAULT FALSE,
    usado_por      UUID        REFERENCES public.usuarios(id) ON DELETE SET NULL,
    expira_em      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
--  ÍNDICES
-- ================================================================

CREATE INDEX idx_congregacoes_estado  ON public.congregacoes (estado);
CREATE INDEX idx_congregacoes_cidade  ON public.congregacoes USING GIN (cidade gin_trgm_ops);

CREATE INDEX idx_usuarios_congregacao ON public.usuarios (congregacao_id);
CREATE INDEX idx_usuarios_papel        ON public.usuarios (papel);
CREATE INDEX idx_usuarios_email        ON public.usuarios (email);

CREATE INDEX idx_territorios_congregacao ON public.territorios (congregacao_id);
CREATE INDEX idx_territorios_numero      ON public.territorios (congregacao_id, numero_mapa);
CREATE INDEX idx_territorios_ativo       ON public.territorios (congregacao_id, ativo);

CREATE INDEX idx_designacoes_congregacao ON public.designacoes (congregacao_id);
CREATE INDEX idx_designacoes_territorio  ON public.designacoes (territorio_id);
CREATE INDEX idx_designacoes_status      ON public.designacoes (congregacao_id, status);
CREATE INDEX idx_designacoes_datas       ON public.designacoes (congregacao_id, data_inicio, data_conclusao);

CREATE INDEX idx_logs_congregacao ON public.logs_atividade (congregacao_id);
CREATE INDEX idx_logs_usuario     ON public.logs_atividade (usuario_id);

CREATE INDEX idx_convites_congregacao ON public.convites (congregacao_id);
CREATE INDEX idx_convites_token       ON public.convites (token);

-- ================================================================
--  TRIGGERS — atualizado_em
-- ================================================================

CREATE OR REPLACE FUNCTION public.fn_set_atualizado_em()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_congregacoes_atualizado
  BEFORE UPDATE ON public.congregacoes
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_atualizado_em();

CREATE OR REPLACE TRIGGER trg_usuarios_atualizado
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_atualizado_em();

CREATE OR REPLACE TRIGGER trg_territorios_atualizado
  BEFORE UPDATE ON public.territorios
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_atualizado_em();

CREATE OR REPLACE TRIGGER trg_designacoes_atualizado
  BEFORE UPDATE ON public.designacoes
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_atualizado_em();

-- ── TRIGGER: conclusão automática de designação ──────────────────
CREATE OR REPLACE FUNCTION public.fn_designacao_conclusao()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.data_conclusao IS NOT NULL AND OLD.data_conclusao IS NULL THEN
    NEW.status = 'concluido';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_designacao_conclusao
  BEFORE UPDATE ON public.designacoes
  FOR EACH ROW EXECUTE FUNCTION public.fn_designacao_conclusao();

-- ================================================================
--  FUNÇÕES HELPER (usadas pelo RLS)
-- ================================================================

-- Retorna congregacao_id do usuário logado
CREATE OR REPLACE FUNCTION public.fn_minha_congregacao()
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT congregacao_id FROM public.usuarios WHERE id = auth.uid();
$$;

-- Retorna papel do usuário logado
CREATE OR REPLACE FUNCTION public.fn_meu_papel()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT papel FROM public.usuarios WHERE id = auth.uid();
$$;

-- TRUE se admin ou auxiliar
CREATE OR REPLACE FUNCTION public.fn_is_gestor()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT papel IN ('admin','auxiliar') FROM public.usuarios WHERE id = auth.uid();
$$;

-- ================================================================
--  ROW LEVEL SECURITY (RLS)
-- ================================================================

ALTER TABLE public.congregacoes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.territorios      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designacoes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_atividade   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convites         ENABLE ROW LEVEL SECURITY;

-- ── CONGREGAÇÕES ─────────────────────────────────────────────────
-- SELECT: qualquer autenticado (necessário para verificar se número existe)
CREATE POLICY "cong_select_auth"
  ON public.congregacoes FOR SELECT
  TO authenticated
  USING (true);

-- UPDATE: somente admin da congregação
CREATE POLICY "cong_update_admin"
  ON public.congregacoes FOR UPDATE
  TO authenticated
  USING (id = public.fn_minha_congregacao() AND public.fn_meu_papel() = 'admin')
  WITH CHECK (id = public.fn_minha_congregacao() AND public.fn_meu_papel() = 'admin');

-- INSERT/DELETE: bloqueado (somente via SECURITY DEFINER)

-- ── USUÁRIOS ─────────────────────────────────────────────────────
-- SELECT para membros ativos: veem todos da sua congregação
CREATE POLICY "usr_select_membro"
  ON public.usuarios FOR SELECT
  TO authenticated
  USING (
    congregacao_id = public.fn_minha_congregacao()
    AND public.fn_meu_papel() IN ('admin','auxiliar','membro')
  );

-- SELECT para pendente/rejeitado: somente o próprio perfil
CREATE POLICY "usr_select_proprio"
  ON public.usuarios FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- UPDATE por gestor: qualquer membro da congregação
CREATE POLICY "usr_update_gestor"
  ON public.usuarios FOR UPDATE
  TO authenticated
  USING (
    congregacao_id = public.fn_minha_congregacao()
    AND public.fn_is_gestor()
  )
  WITH CHECK (
    congregacao_id = public.fn_minha_congregacao()
    AND public.fn_is_gestor()
  );

-- UPDATE próprio: apenas campos pessoais (não bloqueia papel — use SECURITY DEFINER para papel)
CREATE POLICY "usr_update_proprio"
  ON public.usuarios FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- DELETE por admin: membros da congregação (exceto ele mesmo)
CREATE POLICY "usr_delete_admin"
  ON public.usuarios FOR DELETE
  TO authenticated
  USING (
    congregacao_id = public.fn_minha_congregacao()
    AND public.fn_meu_papel() = 'admin'
    AND id <> auth.uid()
  );

-- ── TERRITÓRIOS ──────────────────────────────────────────────────
CREATE POLICY "terr_select_membro"
  ON public.territorios FOR SELECT
  TO authenticated
  USING (
    congregacao_id = public.fn_minha_congregacao()
    AND public.fn_meu_papel() IN ('admin','auxiliar','membro')
  );

CREATE POLICY "terr_insert_gestor"
  ON public.territorios FOR INSERT
  TO authenticated
  WITH CHECK (
    congregacao_id = public.fn_minha_congregacao()
    AND public.fn_is_gestor()
  );

CREATE POLICY "terr_update_gestor"
  ON public.territorios FOR UPDATE
  TO authenticated
  USING (
    congregacao_id = public.fn_minha_congregacao()
    AND public.fn_is_gestor()
  )
  WITH CHECK (
    congregacao_id = public.fn_minha_congregacao()
    AND public.fn_is_gestor()
  );

CREATE POLICY "terr_delete_admin"
  ON public.territorios FOR DELETE
  TO authenticated
  USING (
    congregacao_id = public.fn_minha_congregacao()
    AND public.fn_meu_papel() = 'admin'
  );

-- ── DESIGNAÇÕES ──────────────────────────────────────────────────
CREATE POLICY "des_select_membro"
  ON public.designacoes FOR SELECT
  TO authenticated
  USING (
    congregacao_id = public.fn_minha_congregacao()
    AND public.fn_meu_papel() IN ('admin','auxiliar','membro')
  );

CREATE POLICY "des_insert_membro"
  ON public.designacoes FOR INSERT
  TO authenticated
  WITH CHECK (
    congregacao_id = public.fn_minha_congregacao()
    AND public.fn_meu_papel() IN ('admin','auxiliar','membro')
  );

CREATE POLICY "des_update_gestor"
  ON public.designacoes FOR UPDATE
  TO authenticated
  USING (
    congregacao_id = public.fn_minha_congregacao()
    AND public.fn_is_gestor()
  )
  WITH CHECK (
    congregacao_id = public.fn_minha_congregacao()
    AND public.fn_is_gestor()
  );

CREATE POLICY "des_update_proprio"
  ON public.designacoes FOR UPDATE
  TO authenticated
  USING (
    congregacao_id = public.fn_minha_congregacao()
    AND criado_por = auth.uid()
    AND public.fn_meu_papel() = 'membro'
  )
  WITH CHECK (
    congregacao_id = public.fn_minha_congregacao()
    AND criado_por = auth.uid()
  );

CREATE POLICY "des_delete_gestor"
  ON public.designacoes FOR DELETE
  TO authenticated
  USING (
    congregacao_id = public.fn_minha_congregacao()
    AND public.fn_is_gestor()
  );

-- ── LOGS ─────────────────────────────────────────────────────────
CREATE POLICY "log_select_gestor"
  ON public.logs_atividade FOR SELECT
  TO authenticated
  USING (
    congregacao_id = public.fn_minha_congregacao()
    AND public.fn_is_gestor()
  );
-- INSERT/UPDATE/DELETE: bloqueado (somente via SECURITY DEFINER)

-- ── CONVITES ─────────────────────────────────────────────────────
CREATE POLICY "conv_select_gestor"
  ON public.convites FOR SELECT
  TO authenticated
  USING (
    congregacao_id = public.fn_minha_congregacao()
    AND public.fn_is_gestor()
  );

CREATE POLICY "conv_insert_gestor"
  ON public.convites FOR INSERT
  TO authenticated
  WITH CHECK (
    congregacao_id = public.fn_minha_congregacao()
    AND public.fn_is_gestor()
  );

CREATE POLICY "conv_delete_gestor"
  ON public.convites FOR DELETE
  TO authenticated
  USING (
    congregacao_id = public.fn_minha_congregacao()
    AND public.fn_is_gestor()
    AND usado = FALSE
  );

-- ================================================================
--  FUNÇÕES DE NEGÓCIO
-- ================================================================

-- ── fn_registrar_log ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_registrar_log(
    p_congregacao_id  INTEGER,
    p_usuario_id      UUID,
    p_acao            TEXT,
    p_entidade        TEXT    DEFAULT NULL,
    p_entidade_id     TEXT    DEFAULT NULL,
    p_detalhes        JSONB   DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.logs_atividade
    (congregacao_id, usuario_id, acao, entidade, entidade_id, detalhes)
  VALUES
    (p_congregacao_id, p_usuario_id, p_acao, p_entidade, p_entidade_id, p_detalhes);
END;
$$;

-- ── fn_registrar_congregacao ─────────────────────────────────────
-- Fluxo:
--   - Congregação NÃO existe → cria congregação + usuário como ADMIN
--   - Congregação JÁ existe  → cria usuário como PENDENTE
-- Retorna: { status: 'admin'|'pendente', mensagem: '...' }
CREATE OR REPLACE FUNCTION public.fn_registrar_congregacao(
    p_congregacao_id  INTEGER,
    p_nome            TEXT,
    p_cidade          TEXT,
    p_estado          CHAR(2),
    p_circuito        TEXT,
    p_usuario_nome    TEXT,
    p_usuario_email   TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cong_existe BOOLEAN;
  v_user_id     UUID := auth.uid();
  v_papel       TEXT;
  v_resultado   JSONB;
BEGIN
  -- Verificar se congregação existe
  SELECT EXISTS (
    SELECT 1 FROM public.congregacoes WHERE id = p_congregacao_id
  ) INTO v_cong_existe;

  IF NOT v_cong_existe THEN
    -- Criar congregação
    INSERT INTO public.congregacoes (id, nome, cidade, estado, circuito)
    VALUES (p_congregacao_id, p_nome, p_cidade, p_estado, p_circuito);

    v_papel := 'admin';
  ELSE
    v_papel := 'pendente';
  END IF;

  -- Criar/atualizar usuário
  INSERT INTO public.usuarios (id, congregacao_id, nome, email, papel)
  VALUES (v_user_id, p_congregacao_id, p_usuario_nome, p_usuario_email, v_papel)
  ON CONFLICT (id) DO UPDATE SET
    congregacao_id = p_congregacao_id,
    nome           = p_usuario_nome,
    email          = p_usuario_email,
    papel          = v_papel,
    atualizado_em  = NOW();

  -- Log
  PERFORM public.fn_registrar_log(
    p_congregacao_id, v_user_id,
    CASE WHEN v_papel = 'admin' THEN 'criacao_congregacao' ELSE 'solicitacao_acesso' END,
    'usuarios', v_user_id::TEXT,
    jsonb_build_object('papel', v_papel, 'email', p_usuario_email)
  );

  -- Retornar resultado
  v_resultado := jsonb_build_object(
    'status', v_papel,
    'congregacao_id', p_congregacao_id,
    'mensagem', CASE
      WHEN v_papel = 'admin' THEN 'Congregação criada. Você é o administrador.'
      ELSE 'Solicitação enviada. Aguarde aprovação do administrador.'
    END
  );

  RETURN v_resultado;
END;
$$;

-- ── fn_decidir_usuario ───────────────────────────────────────────
-- Aprova ou rejeita um usuário pendente
CREATE OR REPLACE FUNCTION public.fn_decidir_usuario(
    p_usuario_id  UUID,
    p_decisao     TEXT,   -- 'aprovar' | 'rejeitar'
    p_papel       TEXT    DEFAULT 'membro',  -- 'membro' | 'auxiliar'
    p_motivo      TEXT    DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_admin_id    UUID := auth.uid();
  v_cong_id     INTEGER;
  v_admin_papel TEXT;
  v_acao        TEXT;
BEGIN
  -- Verificar que o executor é gestor
  SELECT congregacao_id, papel INTO v_cong_id, v_admin_papel
  FROM public.usuarios WHERE id = v_admin_id;

  IF v_admin_papel NOT IN ('admin','auxiliar') THEN
    RETURN jsonb_build_object('erro', 'Sem permissão para esta ação.');
  END IF;

  -- Validar p_decisao
  IF p_decisao NOT IN ('aprovar', 'rejeitar') THEN
    RETURN jsonb_build_object('erro', 'Decisão inválida. Use "aprovar" ou "rejeitar".');
  END IF;

  -- Rejeitar exige motivo
  IF p_decisao = 'rejeitar' AND (p_motivo IS NULL OR length(trim(p_motivo)) < 10) THEN
    RETURN jsonb_build_object('erro', 'Motivo de rejeição obrigatório (mínimo 10 caracteres).');
  END IF;

  IF p_decisao = 'aprovar' THEN
    -- Validar papel destino
    IF p_papel NOT IN ('membro','auxiliar') THEN
      RETURN jsonb_build_object('erro', 'Papel destino inválido. Use "membro" ou "auxiliar".');
    END IF;

    UPDATE public.usuarios SET
      papel         = p_papel,
      aprovado_por  = v_admin_id,
      aprovado_em   = NOW(),
      motivo_rejeicao = NULL
    WHERE id = p_usuario_id AND congregacao_id = v_cong_id;

    v_acao := 'aprovacao_usuario';
  ELSE
    UPDATE public.usuarios SET
      papel           = 'rejeitado',
      motivo_rejeicao = p_motivo
    WHERE id = p_usuario_id AND congregacao_id = v_cong_id;

    v_acao := 'rejeicao_usuario';
  END IF;

  -- Log
  PERFORM public.fn_registrar_log(
    v_cong_id, v_admin_id, v_acao,
    'usuarios', p_usuario_id::TEXT,
    jsonb_build_object(
      'decisao', p_decisao,
      'papel_destino', p_papel,
      'motivo', p_motivo
    )
  );

  RETURN jsonb_build_object('status', 'ok', 'decisao', p_decisao);
END;
$$;

-- ── fn_transferir_admin ──────────────────────────────────────────
-- Transfere papel admin para outro membro (atual vira auxiliar)
CREATE OR REPLACE FUNCTION public.fn_transferir_admin(p_novo_admin_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_cong_id  INTEGER;
BEGIN
  -- Verificar que executor é admin
  SELECT congregacao_id INTO v_cong_id
  FROM public.usuarios WHERE id = v_admin_id AND papel = 'admin';

  IF v_cong_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Somente o admin pode transferir a administração.');
  END IF;

  -- Rebaixar admin atual para auxiliar
  UPDATE public.usuarios SET papel = 'auxiliar' WHERE id = v_admin_id;

  -- Promover novo admin
  UPDATE public.usuarios SET papel = 'admin'
  WHERE id = p_novo_admin_id AND congregacao_id = v_cong_id;

  -- Log
  PERFORM public.fn_registrar_log(
    v_cong_id, v_admin_id, 'troca_admin',
    'usuarios', p_novo_admin_id::TEXT,
    jsonb_build_object('novo_admin', p_novo_admin_id, 'ex_admin', v_admin_id)
  );

  RETURN jsonb_build_object('status', 'ok');
END;
$$;

-- ── fn_usar_convite ──────────────────────────────────────────────
-- Usa token de convite para entrar na congregação
CREATE OR REPLACE FUNCTION public.fn_usar_convite(
    p_token          TEXT,
    p_usuario_nome   TEXT,
    p_usuario_email  TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id  UUID := auth.uid();
  v_convite  public.convites%ROWTYPE;
BEGIN
  -- Buscar convite
  SELECT * INTO v_convite FROM public.convites
  WHERE token = p_token AND usado = FALSE AND expira_em > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('erro', 'Convite inválido, já utilizado ou expirado.');
  END IF;

  -- Verificar restrição de e-mail
  IF v_convite.email_destino IS NOT NULL
     AND lower(v_convite.email_destino) <> lower(p_usuario_email) THEN
    RETURN jsonb_build_object('erro', 'Este convite é destinado a outro e-mail.');
  END IF;

  -- Criar usuário
  INSERT INTO public.usuarios (id, congregacao_id, nome, email, papel)
  VALUES (v_user_id, v_convite.congregacao_id, p_usuario_nome, p_usuario_email, v_convite.papel_destino)
  ON CONFLICT (id) DO UPDATE SET
    congregacao_id = v_convite.congregacao_id,
    nome           = p_usuario_nome,
    papel          = v_convite.papel_destino,
    atualizado_em  = NOW();

  -- Marcar convite como usado
  UPDATE public.convites SET usado = TRUE, usado_por = v_user_id WHERE id = v_convite.id;

  -- Log
  PERFORM public.fn_registrar_log(
    v_convite.congregacao_id, v_user_id, 'uso_convite',
    'convites', v_convite.id::TEXT,
    jsonb_build_object('papel', v_convite.papel_destino, 'token', p_token)
  );

  RETURN jsonb_build_object(
    'status', 'ok',
    'congregacao_id', v_convite.congregacao_id,
    'papel', v_convite.papel_destino
  );
END;
$$;

-- ================================================================
--  CONFIGURAÇÃO REALTIME
-- ================================================================

-- Habilitar Realtime na tabela usuarios (para badge de pendentes)
-- Execute no Dashboard: Database → Replication → Tables → usuarios → Enable

-- ================================================================
--  DADOS INICIAIS (opcional — remova se não quiser)
-- ================================================================

-- Para testar: INSERT de congregação e usuário direto (sem RLS):
-- INSERT INTO public.congregacoes (id, nome, cidade, estado) VALUES (99999, 'Congregação Teste', 'São Paulo', 'SP');

-- ================================================================
--  VERIFICAÇÃO FINAL
-- ================================================================
-- Após executar, verifique:
-- 1. SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- 2. SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';
-- 3. SELECT policyname FROM pg_policies WHERE schemaname = 'public';
