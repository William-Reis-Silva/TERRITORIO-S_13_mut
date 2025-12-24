document.addEventListener("DOMContentLoaded", function () {
  var database = firebase.database();
  const startDate = new Date(2023, 8, 1); // Setembro 1, 2023
  const endDate = new Date(2024, 7, 31); // Agosto 31, 2024

  function analisarConclusoes(data, startDate, endDate) {
    const statusPorBairro = {};

    Object.keys(data).forEach((bairro) => {
      const bairroData = data[bairro].Mapas;
      const totalMapas = Object.keys(bairroData).length;

      statusPorBairro[bairro] = {
        NaoIniciados: totalMapas,
        Concluidos: 0,
        EmAndamento: 0,
        SegundaConclusao: 0,
        TotalMapas: totalMapas,
        TotalConclusoes: 0,
        MediaConclusoes: 0,
      };

      Object.keys(bairroData).forEach((mapaId) => {
        const mapaInfo = bairroData[mapaId];
        if (mapaInfo.historico) {
          const historia = Object.values(mapaInfo.historico);
          const historiaFiltrada = historia.filter((hist) => {
            const dataInicio = hist.dataInicio
              ? new Date(hist.dataInicio)
              : null;
            const dataConclusao = hist.dataConclusao
              ? new Date(hist.dataConclusao)
              : null;
            return (
              dataInicio &&
              dataConclusao &&
              startDate <= dataInicio &&
              dataInicio <= endDate &&
              startDate <= dataConclusao &&
              dataConclusao <= endDate
            );
          });

          if (historiaFiltrada.length > 0) {
            const conclusoes = historiaFiltrada.filter(
              (hist) => hist.dataConclusao
            ).length;
            statusPorBairro[bairro].Concluidos += 1;
            statusPorBairro[bairro].TotalConclusoes += conclusoes;
            statusPorBairro[bairro].NaoIniciados -= 1;
            if (conclusoes > 1) {
              statusPorBairro[bairro].SegundaConclusao += conclusoes - 1;
            }
          } else {
            statusPorBairro[bairro].EmAndamento += 1;
            statusPorBairro[bairro].NaoIniciados -= 1;
          }
        }
      });

      const totalConclusoes = statusPorBairro[bairro].TotalConclusoes;
      const totalMapas1 = statusPorBairro[bairro].TotalMapas;
      statusPorBairro[bairro].MediaConclusoes = totalConclusoes / totalMapas;
    });

    return statusPorBairro;
  }

  function fetchMapData() {
    return database
      .ref("Bairros")
      .once("value")
      .then((snapshot) => snapshot.val());
  }

  fetchMapData()
    .then((data) => {
      const statusPorBairro = analisarConclusoes(data, startDate, endDate);

      const bairros = Object.keys(statusPorBairro);
      const naoIniciados = bairros.map(
        (bairro) => statusPorBairro[bairro].NaoIniciados
      );
      const concluidos = bairros.map(
        (bairro) => statusPorBairro[bairro].Concluidos
      );
      const emAndamento = bairros.map(
        (bairro) => statusPorBairro[bairro].EmAndamento
      );
      const segundaConclusao = bairros.map(
        (bairro) => statusPorBairro[bairro].SegundaConclusao
      );
      const mediaConclusoes = bairros.map(
        (bairro) => statusPorBairro[bairro].MediaConclusoes
      );

      const ctx = document.getElementById("myChart").getContext("2d");
      new Chart(ctx, {
        type: "bar",
        data: {
          labels: bairros,
          datasets: [
            {
              label: "Não Iniciados",
              data: naoIniciados,
              backgroundColor: "red",
            },
            {
              label: "Concluídos",
              data: concluidos,
              backgroundColor: "green",
            },
            {
              label: "Em Andamento",
              data: emAndamento,
              backgroundColor: "yellow",
            },
            {
              label: "Segunda Conclusão",
              data: segundaConclusao,
              backgroundColor: "blue",
            },
          ],
        },
        options: {
          plugins: {
            tooltip: {
              callbacks: {
                afterLabel: function (context) {
                  const index = context.dataIndex;
                  return " Média: " + mediaConclusoes[index].toFixed(2);
                },
              },
            },
            datalabels: {
              anchor: "end",
              align: "top",
              offset: 4,
              formatter: function (value, context) {
                const index = context.dataIndex;
                if (context.datasetIndex === 3) {
                  // Mostrar a média apenas na última barra empilhada (Segunda Conclusão)
                  return mediaConclusoes[index].toFixed(2);
                }
                return "";
              },
              color: "black",
              font: {
                weight: "bold",
              },
            },
          },
          scales: {
            x: {
              stacked: true,
            },
            y: {
              stacked: true,
            },
          },
        },
        plugins: [ChartDataLabels],
      });
    })
    .catch((error) => console.error("Error fetching data:", error));
});
