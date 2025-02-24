var nomes = [
  "Kauan",
  "Wemerson",
  "Lucas",
  "Lidinei",
  "Matheus",
  "Thalles",
  "William",
  "Jhony",
];

var grupos = ["Grupo Primavera", "Grupo Timirim", "Grupo Eldorado"];

var idoso = [
  "Paulo Bezerra / Cleuza Armine",
  "Cecilia Martins",
  "Guiomar / Osvaldo",
  "Aparecida Roque",
  "Maria Martins"
];

var acompanhante = [
  "Kauan",
  "Wemerson",
  "Lucas",
  "Lidinei",
  "Matheus",
  "Thalles",
  "William",
  "Jhony",
  "Joebel"
];

var idosoIndex = 0; // Índice para alternar os idosos
var acompanhanteIndex = 0; // Índice para alternar os acompanhantes
var grupoIndex = 0; // Índice global para alternar os grupos
var nomeIndex = 0; // Índice global para manter continuidade entre os meses

function createTableForSaturdaysAndSundays(year, monthIndex) {
  var tableContainer = document.getElementById("table-container");

  var table = document.createElement("table");
  table.classList.add("table");

  var months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  // Adiciona o nome do mês como um cabeçalho acima das datas
  var monthHeaderRow = document.createElement("tr");
  monthHeaderRow.innerHTML =
    "<th colspan='5' class='month-header'>" + months[monthIndex] + "</th>";
  table.appendChild(monthHeaderRow);

  // Adiciona cabeçalhos de coluna
  var headerRow = document.createElement("tr");
  headerRow.innerHTML =
    "<th>Data</th> <th>Dirigente (Sábado)</th> <th>Grupo (Domingo)</th> <th>Idoso</th> <th>Acompanhante</th>";
  table.appendChild(headerRow);

  var daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  for (var day = 1; day <= daysInMonth; day++) {
    var dateStr =
      (day < 10 ? "0" : "") +
      day +
      "/" +
      (monthIndex + 1 < 10 ? "0" : "") +
      (monthIndex + 1) +
      "/" +
      year;

    var dayOfWeek = new Date(year, monthIndex, day).getDay();
    var dirigente = "";
    var grupo = "";
    var idosoSelecionado = "";
    var acompanhanteSelecionado = "";

    if (dayOfWeek === 6) {
      // Sábado
      dirigente = nomes[nomeIndex];
      nomeIndex = (nomeIndex + 1) % nomes.length;

      idosoSelecionado = idoso[idosoIndex];
      idosoIndex = (idosoIndex + 1) % idoso.length;

      acompanhanteSelecionado = acompanhante[acompanhanteIndex];
      acompanhanteIndex = (acompanhanteIndex + 1) % acompanhante.length;
    }

    if (dayOfWeek === 0) {
      // Domingo
      grupo = grupos[grupoIndex];
      grupoIndex = (grupoIndex + 1) % grupos.length;
    }

    if (dirigente || grupo || idosoSelecionado || acompanhanteSelecionado) {
      var row = document.createElement("tr");
      row.innerHTML =
        "<td>" +
        dateStr +
        "</td><td>" +
        dirigente +
        "</td><td>" +
        grupo +
        "</td><td>" +
        idosoSelecionado +
        "</td><td>" +
        acompanhanteSelecionado +
        "</td>";
      table.appendChild(row);
    }
  }

  tableContainer.appendChild(table);
}

function createTable() {
  var year = parseInt(document.getElementById("ano").value);
  var tableContainer = document.getElementById("table-container");
  tableContainer.innerHTML = "";

  // Reinicia os índices apenas quando uma nova tabela é criada
  nomeIndex = 0;
  grupoIndex = 0;
  idosoIndex = 0;
  acompanhanteIndex = 0;

  for (var monthIndex = 0; monthIndex < 12; monthIndex++) {
    createTableForSaturdaysAndSundays(year, monthIndex);
  }
}


function saveTableAsExcel() {
  var table = document.getElementById("table-container");

  var workbook = new ExcelJS.Workbook();
  var worksheet = workbook.addWorksheet("Tabela");

  var rows = table.getElementsByTagName("tr");

  for (var i = 0; i < rows.length; i++) {
    var row = [];
    var cells = rows[i].getElementsByTagName(i === 0 ? "th" : "td");

    for (var j = 0; j < cells.length; j++) {
      row.push(cells[j].innerText);
    }

    worksheet.addRow(row);
  }

  workbook.xlsx.writeBuffer().then(function (buffer) {
    var blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "tabela.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
}

function saveTableAsHTML() {
  var tableContainer = document.getElementById("table-container");
  var tableHTML = tableContainer.innerHTML;

  var htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Programação de Campo</title>
      <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 500px;
            margin: 0 auto;
            padding: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            box-shadow: 0 4px 8px rgba(0, 0, 2, 0.1);
        }
        button {
            padding: 10px 20px;
            margin: 10px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: center;
        }
        .month-header {
            background-color: #4CAF50;
            color: white;
        }
        h1 {
            text-align: center;
        }
      </style>
    </head>
    <body>
      <h1>Programação de Campo ${new Date().getFullYear()}</h1>
      <div id="table-container">
        ${tableHTML}
      </div>
    </body>
    </html>
  `;

  var blob = new Blob([htmlContent], { type: "text/html" });
  var url = URL.createObjectURL(blob);

  var a = document.createElement("a");
  a.href = url;
  a.download = "tabela.html";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
function saveTableToFirebase() {
  if (!firebase.database) {
    alert("Erro: Firebase não está inicializado corretamente");
    return;
  }

  const tableContainer = document.getElementById("table-container");
  const tables = tableContainer.getElementsByTagName("table");
  const db = firebase.database();
  const batch = {};

  try {
    Array.from(tables).forEach((table) => {
      const monthName = table.querySelector(".month-header").innerText.trim();

      const monthData = {};

      const rows = Array.from(table.getElementsByTagName("tr")).slice(2); // Ignora cabeçalhos

      rows.forEach((row) => {
        const cells = row.getElementsByTagName("td");
        if (cells.length >= 5) {
          const dateOriginal = cells[0].innerText.trim();
          const date = dateOriginal.replace(/\//g, "-"); // Converte "04/01/2025" para "04-01-2025"
          const dirigente = cells[1].innerText.trim();
          const grupo = cells[2].innerText.trim();
          const idosoSelecionado = cells[3].innerText.trim();
          const acompanhanteSelecionado = cells[4].innerText.trim();

          if (date) {
            monthData[date] = {
              dirigente: dirigente || null,
              grupo: grupo || null,
              idoso: idosoSelecionado || null,
              acompanhante: acompanhanteSelecionado || null,
              dataOriginal: dateOriginal,
            };
          }
        }
      });

      if (Object.keys(monthData).length > 0) {
        batch[monthName] = monthData;
      }
    });

    db.ref("tabela")
      .set(batch)
      .then(() => {
        alert("Dados salvos com sucesso!");
      })
      .catch((error) => {
        alert("Erro ao salvar: " + error.message);
      });
  } catch (error) {
    alert("Erro ao processar os dados: " + error.message);
  }
}
