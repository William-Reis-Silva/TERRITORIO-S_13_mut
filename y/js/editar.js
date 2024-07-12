/** @format */
function exibirFormularioEdicao(registro) {
  var modal = document.getElementById("myModal");
  var span = document.getElementsByClassName("close")[0];

  // Preenche os campos do formulário com os dados do registro
  document.getElementById("numero_mapa_edit").value = registro.Mapa;
  document.getElementById("bairro_edit").value = registro.bairros;
  document.getElementById("designado_para_edit").value = registro.designadoPara;
  document.getElementById("data_inicio_edit").value = registro.dataInicio;
  document.getElementById("data_conclusao_edit").value = registro.dataConclusao;

  registroAtual = registro; // Armazena o registro atual

  // Exibe o modal
  modal.style.display = "block";

  // Fecha o modal quando o usuário clica no botão de fechar
  span.onclick = function () {
    modal.style.display = "none";
  };

  // Fecha o modal quando o usuário clica em qualquer lugar fora do modal
  window.onclick = function (event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };
}

var registroAtual = null; // Variável global para armazenar o registro atual

function converterData(data) {
  var partes = data.split("-");
  return partes[2] + "/" + partes[1] + "/" + partes[0];
}

function determinarStatus(dataConclusao) {
  return dataConclusao === "" ? "Em andamento" : "Concluído";
}

function carregarDados() {
  var tabelaRef = firebase.database().ref("`Registro_S_13/Ano/${ano}/Bairros/${bairro}/Mapas/Mapa ${numeroMapa}`");

  tabelaRef.once("value", function (snapshot) {
    var corpoTabela = document.getElementById("corpoTabela");
    corpoTabela.innerHTML = ""; // Limpa a tabela antes de adicionar novos dados

    var dados = [];

    snapshot.forEach(function (childSnapshot) {
      var item = childSnapshot.val();
      item.id = childSnapshot.key; // Adiciona a chave do Firebase como id do item
      dados.push(item);
    });

    // Ordenar os dados com base na data
    dados.sort(function (a, b) {
      var dataA = new Date(a.dataInicio);
      var dataB = new Date(b.dataInicio);
      return dataB - dataA; // Ordena do último para o primeiro
    });

    // Adicionar os dados ordenados na tabela
    dados.forEach(function (item) {
      var newRow = corpoTabela.insertRow();

      var cellMapa = newRow.insertCell(0);
      var cellBairro = newRow.insertCell(1);
      var cellDesignado = newRow.insertCell(2);
      var cellInicio = newRow.insertCell(3);
      var cellConclusao = newRow.insertCell(4);
      var cellstatus = newRow.insertCell(5);

      cellMapa.innerHTML = item.numeroMapa;
      cellBairro.innerHTML = item.bairro;
      cellDesignado.innerHTML = item.designadoPara;
      cellInicio.innerHTML = converterData(item.dataInicio); // Converter a data
      cellConclusao.innerHTML = converterData(item.dataConclusao); // Converter a data

      // Determinar o status com base na data de conclusão
      var status = determinarStatus(item.dataConclusao);

      // Adicionar a classe CSS ao status para torná-lo visualmente mais claro
      if (status === "Em andamento") {
        cellstatus.classList.add("status-andamento");
      } else {
        cellstatus.classList.add("status-concluido");
      }

      cellstatus.innerHTML = status;

      // Adicionar evento de duplo clique para cada linha
      newRow.ondblclick = function () {
        exibirFormularioEdicao(item);
      };
    });
  });
}

function exibirFormularioEdicao(registro) {
  var formEdicao = document.getElementById("formEdicao");

  // Preenche os campos do formulário com os dados do registro
  document.getElementById("numero_mapa_edit").value = registro.numeroMapa;
  document.getElementById("bairro_edit").value = registro.bairro;
  document.getElementById("designado_para_edit").value = registro.designadoPara;
  document.getElementById("data_inicio_edit").value = registro.dataInicio;
  document.getElementById("data_conclusao_edit").value = registro.dataConclusao;

  registroAtual = registro; // Armazena o registro atual

  // Exibe o formulário de edição
  formEdicao.style.display = "block";
}

function salvarEdicao() {
  var dataConclusaoEdit = document.getElementById("data_conclusao_edit").value;

  if (registroAtual) {
    // Atualiza a data de conclusão do registro atual
    var registroAtualizado = {
      ...registroAtual,
      dataConclusao: dataConclusaoEdit,
    };

    // Referência ao registro no Firebase
    var registroRef = firebase
      .database()
      .ref("`Registro_S_13/Ano/${ano}/Bairros/${bairro}/Mapas/Mapa ${numeroMapa}`/" + registroAtual.id);

    // Salva as alterações no Firebase
    registroRef.update(registroAtualizado, function (error) {
      if (error) {
        console.error("Erro ao atualizar o registro:", error);
      } else {
        console.log("Registro atualizado com sucesso");
        carregarDados(); // Recarrega os dados na tabela
        var formEdicao = document.getElementById("formEdicao");
        formEdicao.style.display = "none"; // Oculta o formulário de edição
      }
    });
  }
}

function deletarRegistro() {
  if (registroAtual) {
    var registroRef = firebase
      .database()
      .ref("`Registro_S_13/Ano/${ano}/Bairros/${bairro}/Mapas/Mapa ${numeroMapa}`/" + registroAtual.id);

    registroRef.remove(function (error) {
      if (error) {
        console.error("Erro ao deletar o registro:", error);
      } else {
        console.log("Registro deletado com sucesso");
        carregarDados(); // Recarrega os dados na tabela
        var formEdicao = document.getElementById("formEdicao");
        formEdicao.style.display = "none"; // Oculta o formulário de edição
      }
    });
  }
}

window.onload = function () {
  carregarDados();
};
