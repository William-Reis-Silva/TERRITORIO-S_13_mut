firebase.auth().onAuthStateChanged(function (user) {
  const usuarioLogado = !!user;

  // Verificar se o elemento existe antes de tentar acessá-lo
  const mensagemAcessoNegado = document.getElementById("mensagemAcessoNegado");
  const links = document.querySelectorAll("a"); // ou o seletor correto para seus links

  if (!usuarioLogado) {
    if (mensagemAcessoNegado) {
      mensagemAcessoNegado.style.display = "none";
    }

    links.forEach(function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        if (mensagemAcessoNegado) {
          mensagemAcessoNegado.style.display = "block";
        }
      });
    });
  } else {
    const userGreeting = document.getElementById("user-greeting");
    if (userGreeting) {
      userGreeting.style.display = "block";
    }

    if (user.uid) {
      const userId = user.uid;
      const userDocRef = firebase.firestore().collection("usuarios").doc(userId);

      userDocRef
        .get()
        .then(function (doc) {
          const usernameElement = document.getElementById("username");
          if (!usernameElement) return;

          if (doc.exists) {
            const userData = doc.data();
            if (userData && userData.usuario) {
              usernameElement.textContent = userData.usuario;
            } else {
              usernameElement.textContent = "Usuário";
            }
          } else {
            console.warn("Documento do usuário não encontrado");
            usernameElement.textContent = "Usuário";
          }
        })
        .catch(function (error) {
          console.error("Erro ao recuperar os dados do usuário:", error);
        });
    }
  }
});

let mapData = {}; // Dados agrupados por número do mapa
let currentYear = getCurrentServiceYear();

document.addEventListener("DOMContentLoaded", async function () {
  const db = firebase.firestore();

  // Obtemos todos os documentos da coleção 'designacoes'
  const snapshot = await db.collection("designacoes").get();

  snapshot.forEach((doc) => {
    const data = doc.data();
    const { mapa } = data;
    if (!mapData[mapa]) mapData[mapa] = [];
    mapData[mapa].push(data);
  });

  updateYearDisplay();
  renderTable(mapData);
  
  // Adicionar event listeners para os botões de navegação de ano
  setupYearNavigation();
});

function getCurrentServiceYear() {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() < 8 ? year : year + 1;
}

function setupYearNavigation() {
  const prevYearBtn = document.getElementById("prevYearBtn");
  const nextYearBtn = document.getElementById("nextYearBtn");

  if (prevYearBtn) {
    prevYearBtn.addEventListener("click", function () {
      currentYear--;
      updateYearDisplay();
      renderTable(mapData);
    });
  }

  if (nextYearBtn) {
    nextYearBtn.addEventListener("click", function () {
      currentYear++;
      updateYearDisplay();
      renderTable(mapData);
    });
  }
}

function updateYearDisplay() {
  const yearDisplay = document.getElementById("serviceYear");
  if (!yearDisplay) return;

  const start = new Date(currentYear - 1, 8, 1);
  const end = new Date(currentYear, 7, 31);
  yearDisplay.innerHTML = `Ano de serviço: ${currentYear} (Período: ${formatDateFromObject(start)} - ${formatDateFromObject(end)})`;
}

// Nova função para formatar objetos Date
function formatDateFromObject(dateObj) {
  if (!dateObj) return "";
  
  return `${String(dateObj.getDate()).padStart(2, "0")}/${String(
    dateObj.getMonth() + 1
  ).padStart(2, "0")}/${dateObj.getFullYear()}`;
}

// Função para formatar strings de data
function formatDate(dateStr) {
  if (!dateStr) return "";

  const [year, month, day] = dateStr.split("-");
  // Usar os valores diretamente sem criar objeto Date para evitar problemas de fuso horário
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

function renderTable(data) {
  const table = document.querySelector("table tbody");
  if (!table) return;
  
  table.innerHTML = "";

  const maxMapas = Math.max(...Object.keys(data).map(Number)); // quantidade de mapas automática 
  const start = new Date(currentYear - 1, 8, 1);
  const end = new Date(currentYear, 7, 31);

  for (let i = 1; i <= maxMapas; i++) {
    const registros = (data[i] || []).filter((entry) => {
      const ini = new Date(entry.dataInicio);
      const fim = new Date(entry.dataConclusao);
      return (ini >= start && ini <= end) || (fim >= start && fim <= end);
    });

    const ultRegistroAnterior = (data[i] || [])
      .filter((entry) => new Date(entry.dataConclusao) < start)
      .sort((a, b) => new Date(b.dataConclusao) - new Date(a.dataConclusao))[0];

    addRow(table, i, registros, ultRegistroAnterior?.dataConclusao);
  }
}

function addRow(table, mapa, registros, ultDataAnterior) {
  const row1 = table.insertRow();
  const cellMapa = row1.insertCell(0);
  const cellUltima = row1.insertCell(1);

  cellMapa.innerText = mapa;
  cellMapa.rowSpan = 2;
  cellUltima.innerText = registros[registros.length - 1]?.dataConclusao
    ? formatDate(registros[registros.length - 1].dataConclusao)
    : formatDate(ultDataAnterior);
  cellUltima.rowSpan = 2;

  for (let j = 0; j < 4; j++) {
    const cell = row1.insertCell();
    cell.colSpan = 2;
    cell.innerText = registros[j]?.designadoPara || "";
  }

  const row2 = table.insertRow();
  for (let j = 0; j < 4; j++) {
    const cell1 = row2.insertCell();
    const cell2 = row2.insertCell();
    cell1.innerText = registros[j]?.dataInicio ? formatDate(registros[j].dataInicio) : "";
    cell2.innerText = registros[j]?.dataConclusao ? formatDate(registros[j].dataConclusao) : "";
  }
}