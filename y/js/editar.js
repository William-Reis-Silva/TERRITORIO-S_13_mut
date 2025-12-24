 var registroAtual = null;

    function converterData(data) {
      if (!data) return "";
      var partes = data.split("-");
      return partes[2] + "/" + partes[1] + "/" + partes[0];
    }

    function determinarStatus(dataConclusao) {
      return dataConclusao === "" ? "Em andamento" : "Concluído";
    }

    function carregarDados() {
      var tabelaRef = firebase.database().ref("Bairros");

      tabelaRef.once("value", function (snapshot) {
        var corpoTabela = document.getElementById("corpoTabela");
        corpoTabela.innerHTML = "";

        var dados = [];

        snapshot.forEach(function (bairroSnapshot) {
          var bairro = bairroSnapshot.key;
          var mapasSnapshot = bairroSnapshot.child("Mapas");

          mapasSnapshot.forEach(function (mapaSnapshot) {
            var numeroMapa = mapaSnapshot.key;
            var historicoSnapshot = mapaSnapshot.child("historico");

            historicoSnapshot.forEach(function (registroSnapshot) {
              var item = registroSnapshot.val();
              item.id = registroSnapshot.key;
              item.bairro = bairro;
              item.numeroMapa = numeroMapa;
              dados.push(item);
            });
          });
        });

        dados.sort(function (a, b) {
          var statusA = determinarStatus(a.dataConclusao);
          var statusB = determinarStatus(b.dataConclusao);

          if (statusA === "Em andamento" && statusB === "Concluído") return -1;
          if (statusA === "Concluído" && statusB === "Em andamento") return 1;

          var dataA = new Date(a.dataInicio);
          var dataB = new Date(b.dataInicio);
          return dataB - dataA;
        });

        dados.forEach(function (item) {
          var newRow = corpoTabela.insertRow();

          var cellMapa = newRow.insertCell(0);
          var cellBairro = newRow.insertCell(1);
          var cellDesignado = newRow.insertCell(2);
          var cellInicio = newRow.insertCell(3);
          var cellConclusao = newRow.insertCell(4);
          var cellStatus = newRow.insertCell(5);

          cellMapa.innerHTML = item.numeroMapa;
          cellBairro.innerHTML = item.bairro;
          cellDesignado.innerHTML = item.designadoPara;
          cellInicio.innerHTML = converterData(item.dataInicio);
          cellConclusao.innerHTML = converterData(item.dataConclusao);

          var status = determinarStatus(item.dataConclusao);

          if (status === "Em andamento") {
            newRow.classList.add("status-andamento");
            cellStatus.classList.add("status-andamento");
          } else {
            cellStatus.classList.add("status-concluido");
          }

          cellStatus.innerHTML = status;

          newRow.ondblclick = function () {
            exibirFormularioEdicao(item);
          };
        });
      });
    }

    function exibirFormularioEdicao(registro) {
      var modal = document.getElementById("myModal");
      var span = document.getElementsByClassName("close")[0];

      document.getElementById("numero_mapa_edit").value = registro.numeroMapa;
      document.getElementById("bairro_edit").value = registro.bairro;
      document.getElementById("designado_para_edit").value = registro.designadoPara;
      document.getElementById("data_inicio_edit").value = registro.dataInicio;
      document.getElementById("data_conclusao_edit").value = registro.dataConclusao;

      registroAtual = registro;

      modal.style.display = "block";

      span.onclick = function () {
        modal.style.display = "none";
      };

      window.onclick = function (event) {
        if (event.target == modal) {
          modal.style.display = "none";
        }
      };
    }

    function salvarEdicao() {
      if (registroAtual) {
        var dataInicioEdit = document.getElementById("data_inicio_edit").value;
        var dataConclusaoEdit = document.getElementById(
          "data_conclusao_edit"
        ).value;

        var registroAtualizado = {
          dataInicio: dataInicioEdit,
          dataConclusao: dataConclusaoEdit,
          designadoPara: document.getElementById("designado_para_edit").value,
        };

        var status = determinarStatus(dataConclusaoEdit);

        var database = firebase.database();
        var registroRef = database.ref(
          `Bairros/${registroAtual.bairro}/Mapas/${registroAtual.numeroMapa}/historico}`
        );
        registroRef.update(registroAtualizado, function (error) {
          if (error) {
            console.error("Erro ao atualizar o registro:", error);
          } else {
            statusRef.set(status, function (statusError) {
              if (statusError) {
                console.error("Erro ao atualizar o status:", statusError);
              } else {
                console.log("Registro e status atualizados com sucesso");
                carregarDados();
                var modal = document.getElementById("myModal");
                modal.style.display = "none";
              }
            });
          }
        });
      }
    }

    function deletarRegistro() {
      if (registroAtual) {
        var database = firebase.database();
        var registroRef = database.ref(`Bairros/${registroAtual.bairro}/Mapas/${registroAtual.numeroMapa}/historico/${registroAtual.id}`);

        registroRef.remove(function (error) {
          if (error) {
            console.error("Erro ao deletar o registro:", error);
          } else {
            console.log("Registro deletado com sucesso");
            carregarDados();
            var modal = document.getElementById("myModal");
            modal.style.display = "none";
          }
        });
      }
    }
