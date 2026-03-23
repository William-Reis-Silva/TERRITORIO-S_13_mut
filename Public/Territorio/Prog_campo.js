/*************************************************
 * 🔐 AUTENTICAÇÃO
 *************************************************/
window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (!session?.user) {
    console.warn("⚠️ Usuário não autenticado. Redirecionando para login...");
    window.location.href = "../login.html";
  } else {
    console.log("✅ Usuário autenticado:", session.user.email);
  }
});

/*************************************************
 * 📅 CONTROLE DE SEMANAS
 *************************************************/
let offsetSemanas = 0;

/*************************************************
 * 🚀 INICIALIZAÇÃO DA TELA
 *************************************************/
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 DOM pronto, iniciando carregamento");
  configurarBotoes();
  obterSemana(0);
  carregarMapas();
});

/*************************************************
 * ⏪⏩ BOTÕES DE NAVEGAÇÃO
 *************************************************/
function configurarBotoes() {
  const btnAnterior = document.getElementById("semana-anterior");
  const btnProxima = document.getElementById("semana-proxima");

  if (!btnAnterior || !btnProxima) return;

  btnAnterior.addEventListener("click", () => {
    offsetSemanas--;
    obterSemana(offsetSemanas);
  });

  btnProxima.addEventListener("click", () => {
    offsetSemanas++;
    obterSemana(offsetSemanas);
  });
}

/*************************************************
 * 📆 OBTÉM SEMANA ATUAL
 *************************************************/
function obterSemana(offset = 0) {
  console.log("📆 Carregando semana", offset);

  const hoje = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "America/Sao_Paulo",
    })
  );

  const diaSemana = hoje.getDay(); // 0 = domingo

  // Segunda-feira
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(
    hoje.getDate() -
      (diaSemana === 0 ? 6 : diaSemana - 1) +
      offset * 7
  );

  // Domingo
  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(inicioSemana.getDate() + 6);

  atualizarTextoSemana(inicioSemana, fimSemana);
  carregarDados(inicioSemana);
}

/*************************************************
 * 📝 ATUALIZA TEXTO DA SEMANA
 *************************************************/
function atualizarTextoSemana(inicio, fim) {
  const el = document.getElementById("semana-atual");
  if (!el) return;

  const meses = [
    "janeiro","fevereiro","março","abril","maio","junho",
    "julho","agosto","setembro","outubro","novembro","dezembro",
  ];

  const formatar = (d) =>
    `${d.getDate()} de ${meses[d.getMonth()]}`;

  el.textContent = `Semana de ${formatar(inicio)} a ${formatar(fim)}`;
}

// Helpers format YYYY-MM-DD local
const toISODate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/*************************************************
 * 📦 CARREGA DADOS DO SUPABASE
 *************************************************/
async function carregarDados(inicioSemana) {
  console.log("📦 Carregando dados Supabase");

  if (!window.getTenantQuery) {
    console.error("Multitenancy helpers não encontrados! Verifique se supabase_config.js carregou.");
    return;
  }

  const segunda = new Date(inicioSemana);
  segunda.setHours(0, 0, 0, 0);

  const sabado = new Date(segunda);
  sabado.setDate(segunda.getDate() + 5);

  const domingo = new Date(segunda);
  domingo.setDate(segunda.getDate() + 6);

  const sabadoEl = document.getElementById("sabado");
  const domingoEl = document.getElementById("domingo");
  const idosoEl = document.getElementById("idoso");
  const acompanhanteEl = document.getElementById("acompanhante");

  // Limpar campos
  if (sabadoEl) sabadoEl.textContent = "-";
  if (domingoEl) domingoEl.textContent = "-";
  if (idosoEl) idosoEl.textContent = "-";
  if (acompanhanteEl) acompanhanteEl.textContent = "-";

  const dataSabado = toISODate(sabado);
  const dataDomingo = toISODate(domingo);

  // 🔹 BUSCA AGENDAMENTOS MÓVEIS DE SÁBADO, DOMINGO E IDOSO
  // Sabado
  const { data: qSabado } = await window.getTenantQuery("programacao")
    .eq('data_agendamento', dataSabado)
    .eq('tipo', 'sabado')
    .maybeSingle();
  if (qSabado && sabadoEl) sabadoEl.textContent = qSabado.dirigente || "-";

  // Domingo
  const { data: qDomingo } = await window.getTenantQuery("programacao")
    .eq('data_agendamento', dataDomingo)
    .eq('tipo', 'domingo')
    .maybeSingle();
  if (qDomingo && domingoEl) domingoEl.textContent = qDomingo.grupo || "-";

  // Idoso
  const { data: qIdoso } = await window.getTenantQuery("programacao")
    .eq('data_agendamento', dataSabado)
    .eq('tipo', 'idosos')
    .maybeSingle();
  if (qIdoso) {
    if (idosoEl) idosoEl.textContent = qIdoso.idoso || "-";
    if (acompanhanteEl) acompanhanteEl.textContent = qIdoso.acompanhante || "-";
  }

  // 🔹 BUSCA E GERA A PROGRAMAÇÃO FIXA
  const tenantId = window.currentCongregacaoId;
  if (!tenantId) return;

  const { data: congDoc } = await window.supabaseClient.from("congregacoes").select("config").eq("id", tenantId).single();

  const tbody = document.getElementById("corpo-tabela-programacao");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (congDoc && congDoc.config && congDoc.config.programacaoFixa) {
    const progFixa = congDoc.config.programacaoFixa;
    
    // Renderizar a programação fixa
    const ordemDias = { "Segunda":1, "Terça":2, "Quarta":3, "Quinta":4, "Sexta":5 };
    progFixa.sort((a,b) => (ordemDias[a.dia] || 9) - (ordemDias[b.dia] || 9) || a.hora.localeCompare(b.hora));
    
    progFixa.forEach((prog) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${prog.dia}</td>
        <td>${prog.modalidade}</td>
        <td>${prog.hora}</td>
        <td>${prog.dirigente}</td>
        <td>${prog.saida}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Re-adicionar o sábado e domingo
  const trSab = document.createElement("tr");
  trSab.innerHTML = `
    <td>Sábado</td>
    <td>Casa em casa</td>
    <td>09:00</td>
    <td id="sabado_dinamico"></td>
    <td>-</td>
  `;
  const trDom = document.createElement("tr");
  trDom.innerHTML = `
    <td>Domingo</td>
    <td>Carrinho na Feira</td>
    <td>07:30</td>
    <td id="domingo_dinamico"></td>
    <td>-</td>
  `;
  tbody.appendChild(trSab);
  tbody.appendChild(trDom);
  
  const sabNovo = document.getElementById("sabado_dinamico");
  const domNovo = document.getElementById("domingo_dinamico");
  
  if (sabNovo && sabadoEl) sabNovo.textContent = sabadoEl.textContent;
  if (domNovo && domingoEl) domNovo.textContent = domingoEl.textContent;
}

/*************************************************
 * 🗺️ CARREGAR MAPAS DINAMICAMENTE
 *************************************************/
async function carregarMapas() {
  const dropdownMenu = document.getElementById("dropdown-mapas");
  const mapasContainer = document.getElementById("mapas");
  if (!dropdownMenu || !mapasContainer || !window.getTenantQuery) return;

  try {
    const { data: territorios } = await window.getTenantQuery("territorios").select('*');
    if (!territorios) return;

    // Agrupar imagens por bairro
    const bairrosMap = {};
    territorios.forEach(t => {
      if (!t.bairro) return;
      if (!bairrosMap[t.bairro]) bairrosMap[t.bairro] = [];
      if (t.foto_url) bairrosMap[t.bairro].push(t);
    });

    dropdownMenu.innerHTML = "";
    Object.keys(bairrosMap).forEach(bairro => {
      const idBairro = bairro.replace(/\s+/g, '-').toLowerCase();
      const li = document.createElement("li");
      li.innerHTML = `<a href="javascript:void(0);" onclick="showSection('${idBairro}')">${bairro}</a>`;
      dropdownMenu.appendChild(li);

      if (!document.getElementById(idBairro)) {
        const divSection = document.createElement("div");
        divSection.id = idBairro;
        divSection.className = "section";
        divSection.style.display = "none";
        
        let header = `<h1>${bairro}</h1>`;
        let imgsHtml = bairrosMap[bairro].map(item => `
          <img src="${item.foto_url}" alt="Mapa ${item.numero || ''}" onclick="openFullscreen(this.src)" />
        `).join("");

        divSection.innerHTML = header + `<div class="conteudo">${imgsHtml}</div>`;
        mapasContainer.appendChild(divSection);
      }
    });

    document.querySelectorAll('.dropdown').forEach(dropdown => {
      dropdown.replaceWith(dropdown.cloneNode(true));
    });
    
    document.querySelectorAll('.dropdown').forEach(dropdown => {
      dropdown.addEventListener('click', function (e) {
        e.preventDefault();
        const submenu = this.querySelector('.dropdown-menu');
        if (submenu) submenu.classList.toggle('show');
      });
    });

  } catch (err) {
    console.error("Erro ao carregar mapas dinâmicos:", err);
  }
}