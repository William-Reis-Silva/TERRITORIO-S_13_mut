# Design Spec: Tema Claro/Escuro + Admin Master Conectado

**Data:** 2026-03-22
**Projeto:** Território S-13
**Status:** Aprovado

---

## 1. Objetivo

Adicionar suporte a modo claro e modo escuro com toggle pelo usuário, e conectar a página `admin-master.html` ao design system do projeto com controle de acesso correto.

---

## 2. Tema Claro/Escuro

### 2.1 Paleta do Modo Claro (aprovada)

| Token CSS | Valor | Uso |
|---|---|---|
| `--bg-root` | `#F8F9FC` | Fundo geral |
| `--bg-surface` | `#FFFFFF` | Cards, tabelas |
| `--bg-elevated` | `#F1F3F8` | Header de tabela, modais |
| `--bg-hover` | `#E8EBF2` | Hover de rows |
| `--bg-overlay` | `rgba(0,0,0,0.4)` | Fundo de modais |
| `--border` | `rgba(0,0,0,0.08)` | Bordas suaves |
| `--border-hover` | `rgba(0,0,0,0.15)` | Bordas hover |
| `--border-focus` | `rgba(232,64,28,0.6)` | Bordas focus (mantido) |
| `--text-primary` | `#1A1D2E` | Texto principal |
| `--text-secondary` | `#6B7280` | Texto secundário |
| `--text-disabled` | `#A0A3B0` | Texto desabilitado |
| `--accent` | `#E8401C` | Laranja-coral (identidade mantida) |
| `--accent-hover` | `#FF5530` | Hover do acento |
| `--accent-dim` | `rgba(232,64,28,0.10)` | Background dim acento |
| `--accent-glow` | `rgba(232,64,28,0.20)` | Glow do acento |
| `--info` | `#3B5BDB` | Azul índigo secundário |
| `--info-dim` | `rgba(59,91,219,0.10)` | Background dim info |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.08)` | Sombra suave |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,0.10)` | Sombra média |
| `--shadow-lg` | `0 12px 40px rgba(0,0,0,0.14)` | Sombra grande |

Cores semânticas (success, warning, error) mantidas iguais ao modo escuro.

### 2.2 Implementação CSS

Adicionar ao `Public/css/design-system.css`:

```css
[data-theme="light"] {
  --bg-root:       #F8F9FC;
  --bg-surface:    #FFFFFF;
  --bg-elevated:   #F1F3F8;
  --bg-hover:      #E8EBF2;
  --bg-overlay:    rgba(0,0,0,0.4);
  --border:        rgba(0,0,0,0.08);
  --border-hover:  rgba(0,0,0,0.15);
  --text-primary:  #1A1D2E;
  --text-secondary:#6B7280;
  --text-disabled: #A0A3B0;
  --shadow-sm:     0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
  --shadow-md:     0 4px 16px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06);
  --shadow-lg:     0 12px 40px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.08);
  --info:          #3B5BDB;
  --info-dim:      rgba(59,91,219,0.10);
}

[data-theme="light"] input[type="date"] {
  color-scheme: light;
}

[data-theme="light"] .site-header {
  background: rgba(248,249,252,0.85);
}

[data-theme="light"] select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236B7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
}
```

Adicionar estilo do botão toggle ao design-system.css:

```css
.theme-toggle {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 0.9rem;
  transition: all var(--duration) var(--ease);
  flex-shrink: 0;
}
.theme-toggle:hover { color: var(--text-primary); border-color: var(--border-hover); }
```

### 2.3 Script de inicialização (sem flash)

Adicionar no `<head>` de cada página, **antes** de qualquer `<link rel="stylesheet">`:

```html
<script>
  (function(){
    const t = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
  })();
</script>
```

### 2.4 Botão Toggle no Header

**Páginas com `.site-nav`** (`index.html`, `Painel/painel.html`, `admin-master.html`, `S_13.html`, `Registro_S13.html`):
Adicionar dentro de `.site-nav`, antes do primeiro `.nav-divider`.

**Páginas sem `.site-nav`** (`login.html`, `Cadastro.html`):
Adicionar botão flutuante no canto superior direito com posicionamento fixo:

```html
<button class="theme-toggle" id="btn-theme" title="Alternar tema"
  style="position:fixed;top:1rem;right:1rem;z-index:200">
  <i class="fas fa-sun"></i>
</button>
```

**Em ambos os casos**, o HTML do botão padrão (dentro de `.site-nav`) é:

```html
<button class="theme-toggle" id="btn-theme" title="Alternar tema">
  <i class="fas fa-sun"></i>
</button>
```

Script de controle (adicionar junto aos scripts de cada página):

```js
(function() {
  const btn = document.getElementById('btn-theme');
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
    btn.innerHTML = t === 'dark'
      ? '<i class="fas fa-sun"></i>'
      : '<i class="fas fa-moon"></i>';
  }
  applyTheme(localStorage.getItem('theme') || 'dark');
  btn.addEventListener('click', () => {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });
})();
```

### 2.5 Páginas afetadas

- `Public/index.html`
- `Public/login.html`
- `Public/Cadastro.html`
- `Public/Registro_S13.html`
- `Public/S_13.html`
- `Public/admin-master.html`
- `Public/Painel/painel.html`

**Fora do escopo desta entrega:**
- `Public/Territorio/*.html` — não usam `design-system.css`, ficam para iteração futura
- `Public/admin-analytics.html` — não usa `design-system.css`, fica para iteração futura

---

## 3. Admin Master Conectado

### 3.1 Design System

- Adicionar `<link rel="stylesheet" href="../css/design-system.css" />` ao `admin-master.html`
- Remover **todo o bloco `:root { }` inline** do `admin-master.html` (ele redefine tokens como `--accent`, `--font-mono`, etc. que conflitam com o design-system)
- Manter demais estilos inline que sejam específicos da página (tabs, stat-cards, layout)
- Manter estrutura HTML e lógica JS existente
- Adaptar classes para usar tokens do design-system onde possível

### 3.2 Correção de Controle de Acesso

O auth atual apenas verifica sessão. Adicionar verificação de papel:

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
```

### 3.3 Link Master no Header

Nas páginas `index.html` e `Painel/painel.html`, após carregar o perfil do usuário:

```js
if (perfil.papel === 'master') {
  document.getElementById('nav-master').style.display = 'inline-flex';
}
```

HTML do link (dentro de `.site-nav`):

```html
<a href="admin-master.html" id="nav-master" class="nav-link" style="display:none">
  <i class="fas fa-shield-alt" style="font-size:0.8em"></i> Master
</a>
```

---

## 4. Arquivos a Modificar

| Arquivo | Mudanças |
|---|---|
| `css/design-system.css` | + variáveis `[data-theme="light"]` + `.theme-toggle` |
| `index.html` | + script init tema + botão toggle + link nav-master |
| `login.html` | + script init tema + botão toggle |
| `Cadastro.html` | + script init tema + botão toggle |
| `Registro_S13.html` | + script init tema + botão toggle |
| `S_13.html` | + script init tema + botão toggle |
| `Painel/painel.html` | + script init tema + botão toggle + link nav-master |
| `admin-master.html` | + design-system.css + corrigir auth + botão toggle |

---

## 5. Critérios de Aceitação

- [ ] Modo claro e escuro alternam sem flash ao carregar a página
- [ ] Preferência persiste entre sessões (localStorage)
- [ ] Todas as páginas com design-system respondem ao toggle
- [ ] `admin-master.html` redireciona para login se papel ≠ 'master'
- [ ] Link "Master" aparece no header somente para usuários com papel 'master'
- [ ] `admin-master.html` usa o mesmo visual do resto do app
