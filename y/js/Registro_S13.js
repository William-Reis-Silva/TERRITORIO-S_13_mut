// Observar alterações no estado de autenticação do usuário
firebase.auth().onAuthStateChanged(function (user) {
  if (user) {
    // Recuperar o nome do usuário do Realtime Database
    const userId = user.uid;
    const databaseRef = firebase.database().ref("usuarios/" + userId);

    // Opcional: você pode buscar o nome do usuário aqui, se necessário
    databaseRef.once("value", function (snapshot) {
      const userName = snapshot.val().usuario;
      document.getElementById("username").innerText = userName;
    });
  } else {
    // Redirecionar ou exibir uma mensagem para usuários não autenticados
  }
});

var database = firebase.database();

// Adicione um ouvinte de eventos ao campo "numero_mapa"
document
  .getElementById("numero_mapa")
  .addEventListener("change", function (event) {
    var numeroMapa = event.target.value;
    var bairrosRef = database.ref("Bairros");

    bairrosRef.once("value", function (snapshot) {
      snapshot.forEach(function (childSnapshot) {
        var bairro = childSnapshot.key;
        var mapas = childSnapshot.val().Mapas;

        for (var key in mapas) {
          if (mapas.hasOwnProperty(key) && key == numeroMapa) {
            document.getElementById("bairro").value = bairro;
            return;
          }
        }
      });
    });
  });

document.getElementById("Salvar").addEventListener("click", function (event) {
  event.preventDefault();

  var numeroMapa = document.getElementById("numero_mapa").value.trim();
  var designadoPara = document.getElementById("designado_para").value.trim();
  var dataInicio = document.getElementById("data_inicio").value.trim();
  var dataConclusao = document.getElementById("data_conclusao").value.trim();
  var bairro = document.getElementById("bairro").value.trim();

  if (
    numeroMapa === "" ||
    designadoPara === "" ||
    dataInicio === "" ||
    bairro === ""
  ) {
    alert("Por favor, preencha todos os campos do formulário.");
    return;
  }

  var dadosFormulario = {
    dataInicio: dataInicio,
    dataConclusao: dataConclusao,
    designadoPara: designadoPara,
  };
  var referenciaHistorico = database.ref(
    `Bairros/${bairro}/Mapas/${numeroMapa}/historico`
  );
  // Use push() para adicionar um novo item ao histórico
  referenciaHistorico.push(dadosFormulario, function (error) {
    if (error) {
      console.error("Erro ao salvar os dados: ", error);
      alert("Erro ao salvar os dados.");
    } else {
      alert("Dados salvos com sucesso!");
      // Limpar o formulário após salvar
      document.getElementById("numero_mapa").value = "";
      document.getElementById("designado_para").value = "";
      document.getElementById("data_inicio").value = "";
      document.getElementById("data_conclusao").value = "";
      document.getElementById("bairro").value = "";
    }
  });
});
