
function converterData(data) {
  if (!data) return "";
  var partes = data.split("-");
  return partes[2] + "/" + partes[1] + "/" + partes[0];
}

function determinarStatus(dataConclusao) {
  return dataConclusao === "" ? "Em andamento" : "Concluído";
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

var registroAtual = null;

function carregarDados() {
  var ano = new Date().getFullYear();
  var tabelaRef = firebase.database().ref(`Registro_S_13/Ano/${ano}/Bairros`);

  tabelaRef.once("value", function (snapshot) {
    var corpoTabela = document.getElementById("corpoTabela");
    corpoTabela.innerHTML = "";

    var dados = [];

    snapshot.forEach(function (bairroSnapshot) {
      var bairro = bairroSnapshot.key;
      var mapasSnapshot = bairroSnapshot.child("Mapas");

      mapasSnapshot.forEach(function (mapaSnapshot) {
        var numeroMapa = mapaSnapshot.key;
        mapaSnapshot.forEach(function (registroSnapshot) {
          var item = registroSnapshot.val();
          if (!item || registroSnapshot.key === "R0") {
            return;
          }
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
      }

      if (status === "Em andamento") {
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

function salvarEdicao() {
  if (registroAtual) {
    var registroAtualizado = {
      ...registroAtual,
      numeroMapa: document.getElementById("numero_mapa_edit").value,
      bairro: document.getElementById("bairro_edit").value,
      designadoPara: document.getElementById("designado_para_edit").value,
      dataInicio: document.getElementById("data_inicio_edit").value,
      dataConclusao: document.getElementById("data_conclusao_edit").value,
    };

    delete registroAtualizado.id;
    delete registroAtualizado.numeroMapa;
    delete registroAtualizado.bairro;

    var registroRef = firebase
      .database()
      .ref(`Registro_S_13/Ano/${new Date().getFullYear()}/Bairros/${registroAtual.bairro}/Mapas/${registroAtual.numeroMapa}/${registroAtual.id}`);

    registroRef.update(registroAtualizado, function (error) {
      if (error) {
        console.error("Erro ao atualizar o registro:", error);
      } else {
        console.log("Registro atualizado com sucesso");
        carregarDados();
        var formEdicao = document.getElementById("formEdicao");
        formEdicao.style.display = "none";
      }
    });
  }
}

function deletarRegistro() {
  if (registroAtual) {
    var registroRef = firebase
      .database()
      .ref(`Registro_S_13/Ano/${new Date().getFullYear()}/Bairros/${registroAtual.bairro}/Mapas/${registroAtual.numeroMapa}/${registroAtual.id}`);

    registroRef.remove(function (error) {
      if (error) {
        console.error("Erro ao deletar o registro:", error);
      } else {
        console.log("Registro deletado com sucesso");
        carregarDados();
        var formEdicao = document.getElementById("formEdicao");
        formEdicao.style.display = "none";
      }
    });
  }
}

window.onload = function () {
  carregarDados();
};
