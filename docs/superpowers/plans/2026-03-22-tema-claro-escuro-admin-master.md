# Tema Claro/Escuro + Admin Master Conectado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar toggle de tema claro/escuro em todas as páginas do app e conectar o admin-master.html ao design system com controle de acesso correto por papel `master`.

**Architecture:** As variáveis de tema ficam em `design-system.css` via seletor `[data-theme="light"]` aplicado no `<html>`. Um script anti-flash inline no `<head>` aplica o tema antes do render. A lógica do botão toggle fica em `Public/js/theme.js` (compartilhado, evita repetição). O `admin-master.html` passa a usar o mesmo design-system e tem seu auth corrigido para exigir `papel === 'master'`.

**Tech Stack:** Vanilla HTML/CSS/JS, Supabase JS v2, CSS Custom Properties, localStorage

---

## Mapa de Arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `Public/css/design-system.css` | Modificar | Adicionar variáveis `[data-theme="light"]` + classe `.theme-toggle` |
| `Public/js/theme.js` | Criar | Lógica do botão toggle (ícone + localStorage + atributo) |
| `Public/index.html` | Modificar | Script anti-flash + botão toggle + link nav-master |
| `Public/login.html` | Modificar | Script anti-flash + botão toggle fixo |
| `Public/Cadastro.html` | Modificar | Script anti-flash + botão toggle fixo |
| `Public/Registro_S13.html` | Modificar | Script anti-flash + botão toggle |
| `Public/S_13.html` | Modificar | Script anti-flash + botão toggle |
| `Public/Painel/painel.html` | Modificar | Script anti-flash + botão toggle + link nav-master |
| `Public/admin-master.html` | Modificar | Adicionar design-system.css + remover `:root` inline + corrigir auth + botão toggle |

---

## Task 1: Adicionar tema claro ao design-system.css

**Files:**
- Modify: `Public/css/design-system.css`

- [ ] **Step 1: Abrir o arquivo**

Abrir `Public/css/design-system.css`. O arquivo tem ~686 linhas. O bloco `:root` começa na linha 10.

- [ ] **Step 2: Adicionar variáveis do tema claro**

Logo após o fechamento do bloco `:root { }` (após a linha com `--duration: 180ms;` e o `}`), adicionar:

> **Nota:** `--info` no modo claro usa `#3B5BDB` (azul índigo) em vez de `#3B82F6` do modo escuro — isso é intencional, o azul índigo tem melhor contraste em fundo claro.

```css
/* ── TEMA CLARO ──────────────────────────────────────── */
[data-theme="light"] {
  --bg-root:       #F8F9FC;
  --bg-surface:    #FFFFFF;
  --bg-elevated:   #F1F3F8;
  --bg-hover:      #E8EBF2;
  --bg-overlay:    rgba(0, 0, 0, 0.4);

  --border:        rgba(0, 0, 0, 0.08);
  --border-hover:  rgba(0, 0, 0, 0.15);

  --text-primary:  #1A1D2E;
  --text-secondary:#6B7280;
  --text-disabled: #A0A3B0;

  --info:          #3B5BDB;
  --info-dim:      rgba(59, 91, 219, 0.10);

  --shadow-sm:     0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
  --shadow-md:     0 4px 16px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06);
  --shadow-lg:     0 12px 40px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.08);
}

[data-theme="light"] input[type="date"] {
  color-scheme: light;
}

[data-theme="light"] .site-header {
  background: rgba(248, 249, 252, 0.85);
}

[data-theme="light"] select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236B7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
}
```

- [ ] **Step 3: Adicionar estilo do botão toggle**

No final do arquivo, antes da última linha, adicionar:

```css
/* ── TEMA TOGGLE ─────────────────────────────────────── */
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 0.9rem;
  transition: all var(--duration) var(--ease);
  flex-shrink: 0;
}
.theme-toggle:hover {
  color: var(--text-primary);
  border-color: var(--border-hover);
  box-shadow: none;
  transform: none;
}
```

- [ ] **Step 4: Verificar no browser**

Abrir qualquer página que use `design-system.css`. Abrir DevTools → Console e executar:
```js
document.documentElement.setAttribute('data-theme', 'light')
```
Esperado: fundo muda para branco/cinza-gelo, texto fica escuro.

```js
document.documentElement.setAttribute('data-theme', 'dark')
```
Esperado: volta ao fundo escuro.

- [ ] **Step 5: Commit**

```bash
git add Public/css/design-system.css
git commit -m "feat: adiciona tema claro ao design-system com variáveis CSS e estilo do toggle"
```

---

## Task 2: Criar Public/js/theme.js

**Files:**
- Create: `Public/js/theme.js`

- [ ] **Step 1: Criar o arquivo**

Criar `Public/js/theme.js` com o conteúdo:

```js
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
```

- [ ] **Step 2: Verificar sintaxe**

Abrir DevTools → Console em qualquer página e executar:
```js
fetch('js/theme.js').then(r => r.text()).then(console.log)
```
Esperado: código do arquivo aparece sem erros de sintaxe.

- [ ] **Step 3: Commit**

```bash
git add Public/js/theme.js
git commit -m "feat: cria script compartilhado de toggle de tema"
```

---

## Task 3: Adicionar toggle ao index.html + link Master

**Files:**
- Modify: `Public/index.html`

- [ ] **Step 1: Adicionar script anti-flash no `<head>`**

Em `Public/index.html`, localizar a linha `<head>`. Adicionar como **primeira tag dentro do `<head>`**, antes de qualquer `<link>`:

```html
<script>
  (function(){
    var t = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
  })();
</script>
```

- [ ] **Step 2: Adicionar botão toggle e link Master no header**

Localizar o bloco `<nav class="site-nav">` em `index.html`. Adicionar o botão toggle e link Master logo após a abertura da tag `<nav class="site-nav">`:

```html
<button class="theme-toggle" id="btn-theme" title="Alternar tema">
  <i class="fas fa-sun"></i>
</button>
<a href="admin-master.html" id="nav-master" class="nav-link" style="display:none">
  <i class="fas fa-shield-alt" style="font-size:0.8em"></i> Master
</a>
```

- [ ] **Step 3: Mostrar link Master para papel 'master'**

Em `index.html`, localizar o bloco onde o perfil é carregado — a linha:
```js
if (['admin','auxiliar'].includes(perfil.papel)) {
```

Logo antes dessa linha, adicionar:
```js
if (perfil.papel === 'master') {
  document.getElementById('nav-master').style.display = 'inline-flex';
}
```

- [ ] **Step 4: Carregar theme.js**

No final de `index.html`, antes do `</body>`, após os demais scripts, adicionar:

```html
<script src="js/theme.js"></script>
```

- [ ] **Step 5: Verificar no browser**

1. Abrir `index.html` → botão de sol/lua aparece no header
2. Clicar no botão → tema muda, ícone alterna entre sol e lua
3. Recarregar página → tema persiste
4. Login com usuário `master` → link "Master" aparece no header

- [ ] **Step 6: Commit**

```bash
git add Public/index.html
git commit -m "feat: adiciona toggle de tema e link Master ao index.html"
```

---

## Task 4: Adicionar toggle ao login.html

**Files:**
- Modify: `Public/login.html`

- [ ] **Step 1: Adicionar script anti-flash no `<head>`**

Em `Public/login.html`, adicionar como **primeira tag dentro do `<head>`**, antes de qualquer `<link>`:

```html
<script>
  (function(){
    var t = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
  })();
</script>
```

- [ ] **Step 2: Adicionar botão toggle fixo**

Em `login.html`, logo após a tag `<body>`, adicionar:

```html
<button class="theme-toggle" id="btn-theme" title="Alternar tema"
  style="position:fixed;top:1rem;right:1rem;z-index:200">
  <i class="fas fa-sun"></i>
</button>
```

- [ ] **Step 3: Carregar theme.js**

No final de `login.html`, antes do `</body>`, após os demais scripts, adicionar:

```html
<script src="js/theme.js"></script>
```

- [ ] **Step 4: Verificar no browser**

1. Abrir `login.html` → botão fixo aparece no canto superior direito
2. Clicar → tema alterna
3. Navegar para `index.html` → tema persiste

- [ ] **Step 5: Commit**

```bash
git add Public/login.html
git commit -m "feat: adiciona toggle de tema ao login.html"
```

---

## Task 5: Adicionar toggle ao Cadastro.html

**Files:**
- Modify: `Public/Cadastro.html`

- [ ] **Step 1: Adicionar script anti-flash no `<head>`**

Em `Public/Cadastro.html`, adicionar como **primeira tag dentro do `<head>`**, antes de qualquer `<link>`:

```html
<script>
  (function(){
    var t = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
  })();
</script>
```

- [ ] **Step 2: Adicionar botão toggle fixo**

Em `Cadastro.html`, logo após a tag `<body>`, adicionar:

```html
<button class="theme-toggle" id="btn-theme" title="Alternar tema"
  style="position:fixed;top:1rem;right:1rem;z-index:200">
  <i class="fas fa-sun"></i>
</button>
```

- [ ] **Step 3: Carregar theme.js**

No final de `Cadastro.html`, antes do `</body>`, após os demais scripts, adicionar:

```html
<script src="js/theme.js"></script>
```

- [ ] **Step 4: Verificar no browser**

1. Abrir `Cadastro.html` → botão fixo aparece no canto superior direito
2. Clicar → tema alterna sem quebrar o layout do formulário

- [ ] **Step 5: Commit**

```bash
git add Public/Cadastro.html
git commit -m "feat: adiciona toggle de tema ao Cadastro.html"
```

---

## Task 6: Adicionar toggle ao Registro_S13.html

**Files:**
- Modify: `Public/Registro_S13.html`

- [ ] **Step 1: Adicionar script anti-flash no `<head>`**

Em `Public/Registro_S13.html`, adicionar como **primeira tag dentro do `<head>`**, antes de qualquer `<link>`:

```html
<script>
  (function(){
    var t = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
  })();
</script>
```

- [ ] **Step 2: Adicionar botão toggle no `.site-nav`**

Localizar `<nav class="site-nav">` em `Registro_S13.html`. Adicionar logo após a abertura da tag:

```html
<button class="theme-toggle" id="btn-theme" title="Alternar tema">
  <i class="fas fa-sun"></i>
</button>
```

- [ ] **Step 3: Carregar theme.js**

No final de `Registro_S13.html`, antes do `</body>`, após os demais scripts, adicionar:

```html
<script src="js/theme.js"></script>
```

- [ ] **Step 4: Verificar**

Abrir `Registro_S13.html` → botão aparece no header, tema alterna corretamente.

- [ ] **Step 5: Commit**

```bash
git add Public/Registro_S13.html
git commit -m "feat: adiciona toggle de tema ao Registro_S13.html"
```

---

## Task 7: Adicionar toggle ao S_13.html

**Files:**
- Modify: `Public/S_13.html`

- [ ] **Step 1: Adicionar script anti-flash no `<head>`**

Em `Public/S_13.html`, adicionar como **primeira tag dentro do `<head>`**, antes de qualquer `<link>`:

```html
<script>
  (function(){
    var t = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
  })();
</script>
```

- [ ] **Step 2: Adicionar botão toggle no `.site-nav`**

Localizar `<nav class="site-nav">` em `S_13.html`. Adicionar logo após a abertura da tag:

```html
<button class="theme-toggle" id="btn-theme" title="Alternar tema">
  <i class="fas fa-sun"></i>
</button>
```

- [ ] **Step 3: Carregar theme.js**

No final de `S_13.html`, antes do `</body>`, após os demais scripts, adicionar:

```html
<script src="js/theme.js"></script>
```

- [ ] **Step 4: Verificar**

Abrir `S_13.html` → botão aparece no header, tema alterna.

- [ ] **Step 5: Commit**

```bash
git add Public/S_13.html
git commit -m "feat: adiciona toggle de tema ao S_13.html"
```

---

## Task 8: Adicionar toggle ao Painel/painel.html + link Master

**Files:**
- Modify: `Public/Painel/painel.html`

> Atenção: `painel.html` está em subdiretório. O caminho para `js/theme.js` é `../js/theme.js`.

- [ ] **Step 1: Adicionar script anti-flash no `<head>`**

Em `Public/Painel/painel.html`, adicionar como **primeira tag dentro do `<head>`**, antes de qualquer `<link>`:

```html
<script>
  (function(){
    var t = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
  })();
</script>
```

- [ ] **Step 2: Adicionar botão toggle e link Master no `.site-nav`**

Localizar `<nav class="site-nav">` em `painel.html`. Adicionar logo após a abertura da tag:

```html
<button class="theme-toggle" id="btn-theme" title="Alternar tema">
  <i class="fas fa-sun"></i>
</button>
<a href="../admin-master.html" id="nav-master" class="nav-link" style="display:none">
  <i class="fas fa-shield-alt" style="font-size:0.8em"></i> Master
</a>
```

- [ ] **Step 3: Mostrar link Master no JS do painel**

Localizar no JS de `painel.html` onde o perfil do usuário é carregado (buscar por `papel`). Adicionar:

```js
if (perfil.papel === 'master') {
  document.getElementById('nav-master').style.display = 'inline-flex';
}
```

- [ ] **Step 4: Carregar theme.js**

No final de `painel.html`, antes do `</body>`, após os demais scripts, adicionar:

```html
<script src="../js/theme.js"></script>
```

- [ ] **Step 5: Verificar**

1. Abrir `Painel/painel.html` → botão aparece, tema alterna
2. Login com `master` → link "Master" aparece

- [ ] **Step 6: Commit**

```bash
git add Public/Painel/painel.html
git commit -m "feat: adiciona toggle de tema e link Master ao painel.html"
```

---

## Task 9: Conectar admin-master.html ao design system

**Files:**
- Modify: `Public/admin-master.html`

> Este é o maior passo. O `admin-master.html` tem CSS inline extenso e auth incorreta.

- [ ] **Step 1: Adicionar script anti-flash e design-system.css**

No `<head>` de `admin-master.html`:

1. Adicionar como **primeira tag** (antes dos `<link>` existentes):
```html
<script>
  (function(){
    var t = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
  })();
</script>
```

2. Após os `<link>` de Font Awesome existentes, adicionar:
```html
<link rel="stylesheet" href="css/design-system.css" />
```

- [ ] **Step 2: Remover o bloco `:root { }` inline**

Localizar no `<style>` inline o bloco que começa com `:root {` (linha ~11 do arquivo). Remover **todo esse bloco** até o `}` de fechamento, que contém variáveis como `--bg-dark`, `--bg-paper`, `--text-main`, `--accent`, `--font-mono`, `--success`, `--warning`, `--error`, `--info`.

Esses tokens passam a vir do `design-system.css`.

- [ ] **Step 3: Corrigir o auth para exigir papel 'master'**

Localizar a função de inicialização no JS (buscar por `DOMContentLoaded`). Ela atualmente faz:

```js
const { data: userData } = await window.supabaseClient
  .from('usuarios')
  .select('nome, papel')
  .eq('id', session.user.id)
  .single();

if (userData) {
  document.getElementById('admin-name').textContent = userData.nome || session.user.email;
}
```

Substituir por:

```js
const { data: userData } = await window.supabaseClient
  .from('usuarios')
  .select('nome, papel')
  .eq('id', session.user.id)
  .single();

if (!userData || userData.papel !== 'master') {
  window.location.replace('login.html');
  return;
}

document.getElementById('admin-name').textContent = userData.nome || session.user.email;
```

- [ ] **Step 4: Adicionar botão toggle no header**

Localizar o bloco `.header-actions` em `admin-master.html`:

```html
<div class="header-actions">
```

Adicionar o botão toggle como primeiro filho:

```html
<button class="theme-toggle" id="btn-theme" title="Alternar tema">
  <i class="fas fa-sun"></i>
</button>
```

- [ ] **Step 5: Carregar theme.js**

No final de `admin-master.html`, antes do `</body>`, após os demais scripts, adicionar:

```html
<script src="js/theme.js"></script>
```

- [ ] **Step 6: Verificar no browser**

1. Acessar `admin-master.html` **sem** estar logado → deve redirecionar para `login.html`
2. Logar com usuário que **não** é master → deve redirecionar para `login.html`
3. Logar com usuário master → página carrega normalmente
4. Verificar visual: cards, tabelas e header devem seguir o design system
5. Clicar no toggle → tema alterna corretamente

- [ ] **Step 7: Commit**

```bash
git add Public/admin-master.html
git commit -m "feat: conecta admin-master ao design-system, corrige auth e adiciona toggle de tema"
```

---

## Verificação Final

- [ ] Navegar por todas as páginas no modo claro e modo escuro, verificar contraste e legibilidade
- [ ] Verificar que o tema persiste ao navegar entre páginas
- [ ] Verificar que o flash de tema não ocorre em nenhuma página
- [ ] Verificar que o link "Master" só aparece para usuário com `papel === 'master'`
- [ ] Verificar que `admin-master.html` bloqueia acesso de não-masters
