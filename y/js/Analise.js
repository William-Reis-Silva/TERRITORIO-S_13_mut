// Função para exibir tabela com todos os registros
// Função para carregar dados e bairros
function carregarDadosEBairros() {
  console.log("Iniciando carregamento de dados...");

  // Dados dos bairros fornecidos diretamente
  var Mapas_bairro = {
    "Alto Serenata": ["33"],
    "Alto Timirim": ["1", "2"],
    "Coqueiro": ["12"],
    "Córrego do caçador": ["26", "27"],
    "Eldorado ": ["39", "40", "41", "42"],
    "Jardim Primavera": ["23"],
    "Jhon Kennedy": ["13"],
    "João XIII": ["24", "25"],
    "Novo horizonte ": ["28", "29", "30", "31"],
    "Olaria ": ["10", "11", "8", "9"],
    "Primavera": ["18", "19", "20", "21", "22"],
    "Quitandinha ": ["34", "35", "36", "37", "38"],
    "Santa Maria": ["14", "15", "16", "17"],
    "Serenata": ["32"],
    "Timirim": ["3", "4", "5", "6", "7"]
  };

  var registrosRef = firebase.database().ref("Registro_S_13");

  // Promise para carregar dados de Registros do Firebase
  var promiseRegistros = registrosRef.once("value").then(function(snapshotRegistros) {
    console.log("Dados de Registros carregados");
    var registrosData = snapshotRegistros.val();

    // Executa a análise e plotagem dos dados
    analisarEDisplayDados(Mapas_bairro, registrosData);
  }).catch(function(error) {
    console.error("Erro ao carregar dados:", error);
  });
}

// Função para analisar dados e exibir status por bairro
function analisarEDisplayDados(bairrosData, registrosData) {
  console.log("Dados de Bairros:");
  console.table(bairrosData);

  console.log("Dados de Registros:");
  console.table(registrosData);

  // Determina o status por bairro com base nos registros
  var status_por_bairro = determinar_status_por_bairro(bairrosData, registrosData);

  // Exemplo: Mostrando o status dos bairros no console
  console.log("Status por Bairro:");
  console.table(status_por_bairro);

  // Plotar gráfico de barras com os dados
  plotarGraficoBarras(status_por_bairro);

  // Exibir tabela com todos os registros
  exibirTabelaRegistros(registrosData);
}

// Função para determinar o status por bairro com base nos registros
function determinar_status_por_bairro(bairros_data, registros_data) {
  var status_por_bairro = {};

  for (var bairro in bairros_data) {
    if (bairros_data.hasOwnProperty(bairro)) {
      var mapas_bairro = bairros_data[bairro];
      var total_mapas_bairro = mapas_bairro.length;
      var mapas_concluidos = 0;
      var mapas_em_andamento = 0;

      mapas_bairro.forEach(function(mapa) {
        for (var registroId in registros_data) {
          if (registros_data.hasOwnProperty(registroId)) {
            var registro = registros_data[registroId];
            // Verifica se o número do mapa e o bairro correspondem aos dados do registro
            if (registro.numeroMapa == mapa && registro.bairro == bairro) {
              if (registro.dataConclusao) {
                mapas_concluidos++;
              } else if (registro.dataInicio) {
                mapas_em_andamento++;
              }
              break; // Interrompe o loop ao encontrar um registro correspondente
            }
          }
        }
      });

      var status;
      var falta_terminar;

      if (mapas_concluidos === total_mapas_bairro) {
        status = 'Concluído';
        falta_terminar = 0;
      } else if (mapas_concluidos > 0 || mapas_em_andamento > 0) {
        status = 'Em Andamento';
        falta_terminar = total_mapas_bairro - mapas_concluidos - mapas_em_andamento;
      } else {
        status = 'Não Iniciado';
        falta_terminar = total_mapas_bairro;
      }

      status_por_bairro[bairro] = {
        'Status': status,
        'Falta Terminar': falta_terminar,
        'Concluídos': mapas_concluidos,
        'Em Andamento': mapas_em_andamento
      };
    }
  }

  return status_por_bairro;
}

// Função para plotar o gráfico de barras com cores dinâmicas
function plotarGraficoBarras(status_por_bairro) {
  console.log("Iniciando plotagem do gráfico...");

  var bairros = Object.keys(status_por_bairro);
  var dadosConcluidos = [];
  var dadosEmAndamento = [];
  var dadosNaoIniciado = [];

  // Separando os dados para cada status
  bairros.forEach(function(bairro) {
    var status = status_por_bairro[bairro].Status;
    switch (status) {
      case 'Concluído':
        dadosConcluidos.push(status_por_bairro[bairro].Concluídos);
        dadosEmAndamento.push(0);
        dadosNaoIniciado.push(0);
        break;
      case 'Em Andamento':
        dadosConcluidos.push(0);
        dadosEmAndamento.push(status_por_bairro[bairro]['Em Andamento']);
        dadosNaoIniciado.push(0);
        break;
      case 'Não Iniciado':
        dadosConcluidos.push(0);
        dadosEmAndamento.push(0);
        dadosNaoIniciado.push(status_por_bairro[bairro]['Falta Terminar']);
        break;
      default:
        dadosConcluidos.push(0);
        dadosEmAndamento.push(0);
        dadosNaoIniciado.push(0);
        break;
    }
  });

  // Configuração do gráfico
  var ctx = document.getElementById('graficoBarras').getContext('2d');
  var myChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: bairros,
      datasets: [{
        label: 'Concluído',
        data: dadosConcluidos,
        backgroundColor: 'rgba(75, 192, 192, 0.6)'
      }, {
        label: 'Em Andamento',
        data: dadosEmAndamento,
        backgroundColor: 'rgba(255, 206, 86, 0.6)'
      }, {
        label: 'Não Iniciado',
        data: dadosNaoIniciado,
        backgroundColor: 'rgba(255, 99, 132, 0.6)'
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        },
        x: {
          stacked: true
        }
      }
    }
  });

  console.log("Gráfico plotado com sucesso");
}

// Função para exibir tabela com todos os registros
function exibirTabelaRegistros(registrosData) {
  console.log("Exibindo tabela de registros...");

  var tabelaContainer = document.getElementById('tabelaRegistrosContainer');
  var tabelaHtml = '<table border="1"><tr><th>ID</th><th>Bairro</th><th>Número do Mapa</th><th>Data de Início</th><th>Data de Conclusão</th></tr>';

  for (var registroId in registrosData) {
    if (registrosData.hasOwnProperty(registroId)) {
      var registro = registrosData[registroId];
      tabelaHtml += '<tr>';
      tabelaHtml += '<td>' + registroId + '</td>';
      tabelaHtml += '<td>' + registro.bairro + '</td>';
      tabelaHtml += '<td>' + registro.numeroMapa + '</td>';
      tabelaHtml += '<td>' + (registro.dataInicio ? registro.dataInicio : 'N/A') + '</td>';
      tabelaHtml += '<td>' + (registro.dataConclusao ? registro.dataConclusao : 'N/A') + '</td>';
      tabelaHtml += '</tr>';
    }
  }

  tabelaHtml += '</table>';
  tabelaContainer.innerHTML = tabelaHtml;

  console.log("Tabela de registros exibida com sucesso");
}

// Chamada inicial para carregar e analisar os dados
carregarDadosEBairros();