// ================================================================
//  AUTH HANDLER — usado por páginas legadas que carregam este script
//  Gerencia estado de autenticação e define congregacaoId global
// ================================================================

window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
  const user = session?.user;

  if (!user) {
    if (event === 'SIGNED_OUT' || event === null || event === 'INITIAL_SESSION') {
      window.location.href = 'login.html';
    }
    return;
  }

  // Carregar perfil
  try {
    const { data: userData, error } = await window.supabaseClient
      .from('usuarios')
      .select('nome, papel, congregacao_id')
      .eq('id', user.id)
      .single();

    if (!userData || error) {
      console.warn('Perfil não encontrado:', error);
      return;
    }

    // Redirecionar pendente/rejeitado
    if (['pendente', 'rejeitado'].includes(userData.papel)) {
      window.location.href = 'login.html';
      return;
    }

    // Definir congregação global
    if (userData.congregacao_id && window.setCongregacaoId) {
      window.setCongregacaoId(userData.congregacao_id);
    }

    // Atualizar UI legada
    const usernameEl = document.getElementById('username');
    if (usernameEl) usernameEl.textContent = userData.nome || 'Usuário';

    const greetingEl = document.getElementById('user-greeting');
    if (greetingEl) greetingEl.style.display = 'block';

    // Mostrar botão admin para admin/auxiliar (compatibilidade com pages antigas)
    const adminBtn = document.getElementById('admin');
    if (adminBtn) {
      adminBtn.style.display =
        ['admin', 'auxiliar'].includes(userData.papel) ? 'block' : 'none';
    }

  } catch (err) {
    console.error('Erro ao recuperar dados do usuário:', err);
  }
});

// Logout
const logoutLink = document.getElementById('logout');
if (logoutLink) {
  logoutLink.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await window.supabaseClient.auth.signOut();
      window.location.href = 'login.html';
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
    }
  });
}
