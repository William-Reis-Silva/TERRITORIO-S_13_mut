
async function extrairDados() {
  const ref = firebase.database().ref('Bairros');
  const snapshot = await ref.once('value');
  return snapshot.val();
}

async function processarDados() {
  const dados = await extrairDados();
  const registros = [];

  for (const bairro in dados) {
    if (dados.hasOwnProperty(bairro)) {
      const mapas = dados[bairro].Mapas;
      for (const numeroMapa in mapas) {
        if (mapas.hasOwnProperty(numeroMapa)) {
          const historico = mapas[numeroMapa].historico;
          for (const idHistorico in historico) {
            if (historico.hasOwnProperty(idHistorico)) {
              const detalhes = historico[idHistorico];
              registros.push({
                Bairro: bairro,
                NumeroMapa: numeroMapa,
                IdHistorico: idHistorico,
                DataInicio: detalhes.dataInicio || '',
                DataConclusao: detalhes.dataConclusao || '',
                DesignadoPara: detalhes.designadoPara || ''
              });
            }
          }
        }
      }
    }
  }
  return registros;
}

async function gerarGrafico() {
  const dados = await processarDados();
  const statusPorBairro = dados.reduce((acc, curr) => {
    const bairro = curr.Bairro;
    const status = curr.DataConclusao ? 'Concluído' : 'Em Aberto';
    if (!acc[bairro]) {
      acc[bairro] = { 'Concluído': 0, 'Em Aberto': 0 };
    }
    acc[bairro][status]++;
    return acc;
  }, {});

  const labels = Object.keys(statusPorBairro);
  const concluidoData = labels.map(label => statusPorBairro[label].Concluído);
  const emAbertoData = labels.map(label => statusPorBairro[label]['Em Aberto']);

  const ctx = document.getElementById('statusChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Concluído',
          data: concluidoData,
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        },
        {
          label: 'Em Aberto',
          data: emAbertoData,
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Chame a função para gerar o gráfico quando a página carregar
window.onload = gerarGrafico;
