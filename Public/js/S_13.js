firebase.auth().onAuthStateChanged(function (user) {
  const usuarioLogado = !!user;

  if (!usuarioLogado) {
    mensagemAcessoNegado.style.display = "none";

    links.forEach(function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        mensagemAcessoNegado.style.display = "block";
      });
    });
  } else {
    document.getElementById("user-greeting").style.display = "block";

    if (user.uid) {
      const userId = user.uid;
      const userDocRef = firebase.firestore().collection("usuarios").doc(userId);

      userDocRef
        .get()
        .then(function (doc) {
          if (doc.exists) {
            const userData = doc.data();
            if (userData && userData.usuario) {
              document.getElementById("username").textContent = userData.usuario;
            } else {
              document.getElementById("username").textContent = "Usuário";
            }
          } else {
            console.warn("Documento do usuário não encontrado");
            document.getElementById("username").textContent = "Usuário";
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
});

function getCurrentServiceYear() {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() < 8 ? year : year + 1;
}

function updateYearDisplay() {
  const yearDisplay = document.getElementById("serviceYear");
  const start = new Date(currentYear - 1, 8, 1);
  const end = new Date(currentYear, 7, 31);
  yearDisplay.innerHTML = `Ano de serviço: ${currentYear} (Período: ${formatDate(start)} - ${formatDate(end)})`;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}/${date.getFullYear()}`;
}

function renderTable(data) {
  const table = document.querySelector("table tbody");
  table.innerHTML = "";

  const maxMapas = Math.max(...Object.keys(data).map(Number));//quantidade de mapas automática 
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
