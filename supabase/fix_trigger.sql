-- ================================================================
--  CORREÇÃO RÁPIDA — Execute este SQL no Supabase SQL Editor
--  Resolve: "Database error saving new user" (erro 500 no cadastro)
-- ================================================================

-- Remove o trigger automático do Supabase que tenta inserir em
-- public.usuarios no momento do auth.signUp() — falha porque
-- congregacao_id é NOT NULL e ainda não foi informado.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Verificar se foi removido (deve retornar 0 linhas):
-- SELECT trigger_name FROM information_schema.triggers
-- WHERE event_object_table = 'users' AND trigger_schema = 'auth';
