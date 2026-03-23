// ================================================================
//  CADASTRO — Registro de usuário e congregação
//  Usa fn_registrar_congregacao() via RPC para atomicidade
// ================================================================

document.addEventListener('DOMContentLoaded', function () {
  const form      = document.getElementById('cadastro-form');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome          = document.getElementById('usuario').value.trim();
    const email         = document.getElementById('email').value.trim();
    const senha         = document.getElementById('senha').value;
    const congregacaoId = parseInt(document.getElementById('congregacaoId').value, 10);
    const congNome      = document.getElementById('congregacaoNome').value.trim();
    const cidade        = document.getElementById('cidade').value.trim();
    const estado        = document.getElementById('estado').value.trim();
    const circuito      = document.getElementById('circuito').value.trim() || null;

    // Validações básicas
    if (!nome || !email || !senha) {
      showError('Preencha todos os campos obrigatórios.');
      return;
    }
    if (!congregacaoId || congregacaoId <= 0) {
      showError('Informe um número de congregação válido (maior que zero).');
      return;
    }
    if (!congNome) {
      showError('Informe o nome da congregação.');
      return;
    }
    if (!cidade) {
      showError('Informe a cidade da congregação.');
      return;
    }
    if (!estado || estado.length !== 2) {
      showError('Selecione o estado (UF) da congregação.');
      return;
    }

    hideError();
    submitBtn.disabled  = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';

    try {
      // 1. Criar conta no Supabase Auth
      const { data: authData, error: authError } = await window.supabaseClient.auth.signUp({
        email,
        password: senha,
      });

      if (authError) {
        let msg = authError.message;
        if (msg.includes('already registered') || msg.includes('User already registered'))
          msg = 'Este e-mail já está cadastrado. Faça login ou recupere sua senha.';
        throw new Error(msg);
      }

      // Verificar se veio sessão imediata (email confirmation desabilitado)
      // ou se precisa confirmar email
      const session = authData.session;

      if (!session) {
        // Email confirmation ativado: orientar o usuário
        mostrarSucesso('Verifique seu e-mail para confirmar o cadastro antes de continuar.');
        submitBtn.disabled  = true;
        submitBtn.innerHTML = 'Enviado — verifique seu e-mail';
        return;
      }

      // 2. Chamar fn_registrar_congregacao via RPC
      const { data: resultado, error: rpcError } = await window.supabaseClient
        .rpc('fn_registrar_congregacao', {
          p_congregacao_id: congregacaoId,
          p_nome:           congNome,
          p_cidade:         cidade,
          p_estado:         estado.toUpperCase(),
          p_circuito:       circuito,
          p_usuario_nome:   nome,
          p_usuario_email:  email,
        });

      if (rpcError) throw new Error(rpcError.message);

      // 3. Tratar resultado
      const status = resultado?.status;

      if (status === 'admin') {
        // Primeiro usuário → admin → redirecionar para painel
        window.location.href = 'Painel/painel.html';

      } else if (status === 'pendente') {
        // Usuário pendente → mostrar tela de espera
        const congNomeDisplay = resultado?.nome_congregacao || congNome;
        mostrarTelaPendente(congNomeDisplay);

      } else {
        throw new Error('Resposta inesperada do servidor. Tente novamente.');
      }

    } catch (err) {
      console.error('Erro no cadastro:', err);
      showError(err.message || 'Falha no cadastro. Tente novamente mais tarde.');
      submitBtn.disabled  = false;
      submitBtn.innerHTML = 'Tentar novamente <i class="fas fa-arrow-right"></i>';
    }
  });
});

// ── HELPERS ───────────────────────────────────────────────────────

function showError(msg) {
  const el = document.getElementById('mensagem-erro');
  el.textContent   = msg;
  el.style.display = 'block';
}

function hideError() {
  const el = document.getElementById('mensagem-erro');
  if (el) el.style.display = 'none';
}

function mostrarSucesso(msg) {
  const form = document.getElementById('cadastro-form');
  if (form) form.style.display = 'none';
  showError('');
  hideError();
  // Mostrar mensagem de sucesso como info
  const el = document.getElementById('mensagem-erro');
  el.style.background    = 'var(--success-dim)';
  el.style.color         = 'var(--success)';
  el.style.borderColor   = 'rgba(34,197,94,0.2)';
  el.textContent         = msg;
  el.style.display       = 'block';
}

function mostrarTelaPendente(nomeCongreg) {
  // Ocultar formulário e barra de passo
  const form      = document.getElementById('cadastro-form');
  const topBar    = document.querySelector('.top-bar');
  const cardHead  = document.querySelector('.card-header');
  if (form)     form.style.display    = 'none';
  if (cardHead) cardHead.style.display = 'none';
  hideError();

  // Exibir tela de espera
  const espera = document.getElementById('tela-espera');
  const nomEl  = document.getElementById('cong-nome-espera');
  if (nomEl)   nomEl.textContent  = nomeCongreg;
  if (espera)  espera.style.display = 'block';
}
