// S_13.js — integrado com Supabase (multi-tenant)

let mapData    = {};
let currentYear = getCurrentServiceYear();

// ── PONTO DE ENTRADA ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  iniciarComAuth();
});

function mostrarStatus(msg) {
  const tbody = document.querySelector('table tbody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:16px;color:var(--text-secondary)">' + msg + '</td></tr>';
  }
}

async function iniciarComAuth() {
  mostrarStatus('Verificando sessão...');
  const supabase = window.supabaseClient;

  // getSession() lê do localStorage — rápido e sem race condition
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    mostrarStatus('Sessão não encontrada. Redirecionando...');
    window.location.href = '../index.html';
    return;
  }

  await configurarUsuario(session.user);
}

async function configurarUsuario(user) {
  mostrarStatus('Carregando dados do usuário...');
  const supabase = window.supabaseClient;

  const { data: userData, error } = await supabase
    .from('usuarios')
    .select('congregacao_id')
    .eq('id', user.id)
    .single();

  if (error || !userData) {
    mostrarStatus('Erro: usuário não encontrado. (' + (error?.message || '') + ')');
    console.error('usuarios query error:', error);
    return;
  }

  if (!userData.congregacao_id) {
    mostrarStatus('Erro: usuário sem congregação associada.');
    console.error('congregacao_id ausente para user:', user.id);
    return;
  }

  window.setCongregacaoId(userData.congregacao_id);
  await carregarDados();
}

async function carregarDados() {
  mostrarStatus('Carregando designações...');
  const supabase = window.supabaseClient;
  const tenantId = window.currentCongregacaoId;

  try {
    // 1. Buscar territórios para montar lookup: territorio_id → numero
    const { data: territorios, error: terrErr } = await supabase
      .from('territorios')
      .select('id, numero_mapa')
      .eq('congregacao_id', tenantId);

    if (terrErr) {
      mostrarStatus('Erro ao buscar territórios: ' + terrErr.message);
      return;
    }

    const territorioMap = {};
    (territorios || []).forEach(function (t) {
      territorioMap[t.id] = t.numero_mapa;
    });

    // 2. Buscar designações
    const { data: snapshot, error } = await supabase
      .from('designacoes')
      .select('*')
      .eq('congregacao_id', tenantId);

    if (error) {
      mostrarStatus('Erro ao buscar designações: ' + error.message);
      return;
    }

    if (!snapshot || snapshot.length === 0) {
      mostrarStatus('Nenhuma designação encontrada para esta congregação.');
      return;
    }

    // 3. Agrupar por número do território
    mapData = {};
    snapshot.forEach(function (doc) {
      const numero = territorioMap[doc.territorio_id];
      if (!numero) return;
      if (!mapData[numero]) mapData[numero] = [];
      mapData[numero].push(doc);
    });

    updateYearDisplay();
    renderTable(mapData);
    setupYearNavigation();

  } catch (err) {
    mostrarStatus('Erro inesperado: ' + err.message);
    console.error('Erro inesperado ao carregar dados:', err);
  }
}

// ── ANO DE SERVIÇO ────────────────────────────────────────────
function getCurrentServiceYear() {
  const now  = new Date();
  const year = now.getFullYear();
  return now.getMonth() < 8 ? year : year + 1;
}

function updateYearDisplay() {
  const yearDisplay = document.getElementById('serviceYear');
  if (!yearDisplay) return;

  const start = new Date(currentYear - 1, 8, 1);
  const end   = new Date(currentYear, 7, 31);
  yearDisplay.innerHTML =
    'Ano de serviço: ' + currentYear +
    ' (Período: ' + formatDateFromObject(start) + ' - ' + formatDateFromObject(end) + ')';
}

function setupYearNavigation() {
  const prevBtn = document.getElementById('prevYearBtn');
  const nextBtn = document.getElementById('nextYearBtn');

  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      currentYear--;
      updateYearDisplay();
      renderTable(mapData);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      currentYear++;
      updateYearDisplay();
      renderTable(mapData);
    });
  }
}

// ── RENDERIZAÇÃO ──────────────────────────────────────────────
function renderTable(data) {
  const tbody = document.querySelector('table tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  const keys = Object.keys(data).map(Number);
  if (keys.length === 0) return;

  const maxMapa = Math.max(...keys);
  const start   = new Date(currentYear - 1, 8, 1);
  const end     = new Date(currentYear, 7, 31);

  for (let i = 1; i <= maxMapa; i++) {
    const registros = (data[i] || []).filter(function (entry) {
      const ini = new Date(entry.data_inicio);
      const fim = new Date(entry.data_conclusao);
      return (ini >= start && ini <= end) || (fim >= start && fim <= end);
    });

    const ultAnterior = (data[i] || [])
      .filter(function (e) { return new Date(e.data_conclusao) < start; })
      .sort(function (a, b) { return new Date(b.data_conclusao) - new Date(a.data_conclusao); })[0];

    addRow(tbody, i, registros, ultAnterior?.data_conclusao);
  }
}

function addRow(tbody, mapa, registros, ultDataAnterior) {
  const row1 = tbody.insertRow();

  const cellMapa = row1.insertCell(0);
  cellMapa.innerText = mapa;
  cellMapa.rowSpan = 2;

  const cellUltima = row1.insertCell(1);
  const ultimoRegistro = registros[registros.length - 1];
  cellUltima.innerText = ultimoRegistro?.data_conclusao
    ? formatDate(ultimoRegistro.data_conclusao)
    : formatDate(ultDataAnterior);
  cellUltima.rowSpan = 2;

  for (let j = 0; j < 4; j++) {
    const cell = row1.insertCell();
    cell.colSpan = 2;
    cell.innerText = registros[j]?.designado_para || '';
  }

  const row2 = tbody.insertRow();
  for (let j = 0; j < 4; j++) {
    const cell1 = row2.insertCell();
    const cell2 = row2.insertCell();
    cell1.innerText = registros[j]?.data_inicio    ? formatDate(registros[j].data_inicio)    : '';
    cell2.innerText = registros[j]?.data_conclusao ? formatDate(registros[j].data_conclusao) : '';
  }
}

// ── FORMATAÇÃO DE DATAS ───────────────────────────────────────
function formatDateFromObject(dateObj) {
  if (!dateObj) return '';
  return (
    String(dateObj.getDate()).padStart(2, '0') + '/' +
    String(dateObj.getMonth() + 1).padStart(2, '0') + '/' +
    dateObj.getFullYear()
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return String(day).padStart(2, '0') + '/' + String(month).padStart(2, '0') + '/' + year;
}
