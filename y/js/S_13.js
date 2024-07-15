let mapData = {}; // Cache para armazenar os dados dos mapas
let currentYear = getCurrentServiceYear(); // Calcula o ano de serviço atual com base na data atual

document.addEventListener("DOMContentLoaded", function () {
  const database = firebase.database();
  const bairrosRef = database.ref("Bairros");

  // Carregar e armazenar todos os dados em cache
  bairrosRef.once("value", function (snapshot) {
    mapData = snapshot.val();
    updateYearDisplay();
    renderTable(mapData);
  });

  // Listener para atualizações nos dados
  bairrosRef.on("child_changed", function (snapshot) {
    const updatedData = snapshot.val();
    mapData[snapshot.key] = updatedData;
    renderTable(mapData); // Atualizar a tabela com os dados em cache atualizados
  });

  document.getElementById("prevYearBtn").addEventListener("click", function () {
    currentYear--;
    updateYearDisplay();
    renderTable(mapData);
  });

  document.getElementById("nextYearBtn").addEventListener("click", function () {
    currentYear++;
    updateYearDisplay();
    renderTable(mapData);
  });
});

function getCurrentServiceYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  // Se estamos antes de setembro, o ano de serviço atual é o ano corrente
  // Se estamos em setembro ou depois, o ano de serviço é o próximo ano
  return month < 8 ? year : year + 1;
}

function updateYearDisplay() {
  const yearDisplay = document.getElementById("serviceYear");
  const startDate = new Date(currentYear - 1, 8, 1); // 1º de setembro do ano anterior
  const endDate = new Date(currentYear, 7, 31); // 31 de agosto do ano corrente
  yearDisplay.innerHTML = `Ano de serviço: ${currentYear} (Período: ${formatDate(startDate.toISOString())} - ${formatDate(endDate.toISOString())})`;
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}


function renderTable(data) {
  const table = document.querySelector("table tbody");
  table.innerHTML = ''; // Limpar a tabela antes de renderizar

  const maxMapas = 41; // Total de mapas
  const startDate = new Date(currentYear - 1, 8, 1); // 1º de setembro do ano anterior
  const endDate = new Date(currentYear, 7, 31); // 31 de agosto do ano corrente

  const previousStartDate = new Date(currentYear - 2, 8, 1); // 1º de setembro de dois anos atrás
  const previousEndDate = new Date(currentYear - 1, 7, 31); // 31 de agosto do ano anterior

  // Armazenar as últimas datas de conclusão do ano anterior
  let previousYearLastCompleted = {};

  // Primeiro, buscamos as últimas datas concluídas do ano anterior
  for (let i = 1; i <= maxMapas; i++) {
    Object.keys(data).forEach((bairro) => {
      const mapas = data[bairro].Mapas;
      if (mapas) {
        Object.keys(mapas).forEach((mapKey) => {
          const mapa = mapas[mapKey];
          if (mapa.id === `Mapa ${i}`) {
            const historico = Object.values(mapa.historico || {}).filter(entry => {
              const entryEndDate = new Date(entry.dataConclusao);
              return entryEndDate >= previousStartDate && entryEndDate <= previousEndDate;
            });
            if (historico.length > 0) {
              previousYearLastCompleted[i] = historico[historico.length - 1].dataConclusao;
            }
          }
        });
      }
    });
  }

  // Agora, renderizamos a tabela para o ano atual
  for (let i = 1; i <= maxMapas; i++) {
    let found = false;
    Object.keys(data).forEach((bairro) => {
      const mapas = data[bairro].Mapas;
      if (mapas) {
        Object.keys(mapas).forEach((mapKey) => {
          const mapa = mapas[mapKey];
          if (mapa.id === `Mapa ${i}` && !found) {
            const historico = Object.values(mapa.historico || {}).filter(entry => {
              const entryStartDate = new Date(entry.dataInicio);
              const entryEndDate = new Date(entry.dataConclusao);
              return (entryStartDate >= startDate && entryStartDate <= endDate) ||
                     (entryEndDate >= startDate && entryEndDate <= endDate) ||
                     (entryStartDate <= startDate && entryEndDate >= endDate);
            });
            if (historico.length > 0) {
              found = true;
              addRow(table, i, mapa, historico, previousYearLastCompleted[i]);
            } else if (!found) {
              // Se não houver histórico para o ano atual, usamos a última data do ano anterior
              found = true;
              addRow(table, i, mapa, [], previousYearLastCompleted[i]);
            }
          }
        });
      }
    });
    if (!found) {
      // Adiciona uma linha vazia se o mapa não for encontrado
      addEmptyRow(table, i, previousYearLastCompleted[i]);
    }
  }
}

function addRow(table, mapNumber, mapa, historico, previousYearLastCompleted) {
  const row = table.insertRow(-1);
  const cellTerr = row.insertCell(0);
  cellTerr.innerHTML = mapNumber; // Número do mapa
  cellTerr.rowSpan = 2;

  const cellUltData = row.insertCell(1);
  cellUltData.innerHTML =
    historico.length > 0
      ? formatDate(historico[historico.length - 1].dataConclusao)
      : formatDate(previousYearLastCompleted);
  cellUltData.rowSpan = 2;

  // Adiciona as células para cada designado para
  for (let j = 0; j < 4; j++) {
    const cellDesigPara = row.insertCell(2 + j);
    cellDesigPara.colSpan = 2;
    if (j < historico.length) {
      cellDesigPara.innerHTML = historico[j].designadoPara;
    } else {
      cellDesigPara.innerHTML = "";
    }
  }

  // Segunda linha para datas
  const rowDates = table.insertRow(-1);
  for (let j = 0; j < 4; j++) {
    if (j < historico.length) {
      const cellDataDesig = rowDates.insertCell(2 * j);
      const cellDataConc = rowDates.insertCell(1 + 2 * j);
      cellDataDesig.innerHTML = formatDate(historico[j].dataInicio);
      cellDataConc.innerHTML = formatDate(historico[j].dataConclusao);
    } else {
      rowDates.insertCell(2 * j).innerHTML = "";
      rowDates.insertCell(1 + 2 * j).innerHTML = "";
    }
  }
}

function addEmptyRow(table, mapNumber, previousYearLastCompleted) {
  const row = table.insertRow(-1);
  const cellTerr = row.insertCell(0);
  cellTerr.innerHTML = mapNumber;
  cellTerr.rowSpan = 2;

  const cellUltData = row.insertCell(1);
  cellUltData.innerHTML = formatDate(previousYearLastCompleted);
  cellUltData.rowSpan = 2;

  for (let k = 0; k < 4; k++) {
    const cellEmpty = row.insertCell(2 + k);
    cellEmpty.colSpan = 2;
    cellEmpty.innerHTML = "";
  }

  const rowDates = table.insertRow(-1);
  for (let k = 0; k < 8; k++) {
    rowDates.insertCell(k).innerHTML = "";
  }
}


                
