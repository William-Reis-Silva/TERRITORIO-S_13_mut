// ================================================================
//  TEMA TOGGLE — Território S-13
//  Depende de: botão com id="btn-theme" na página
//  Persiste: localStorage chave 'theme' ('dark' | 'light')
// ================================================================
(function () {
  const btn = document.getElementById('btn-theme');
  if (!btn) return;

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
    btn.innerHTML = t === 'dark'
      ? '<i class="fas fa-sun"></i>'
      : '<i class="fas fa-moon"></i>';
    btn.title = t === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro';
  }

  // Aplicar tema atual (já definido pelo script anti-flash no <head>)
  applyTheme(document.documentElement.getAttribute('data-theme') || 'dark');

  btn.addEventListener('click', function () {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
})();
