// Adicione um ouvinte de eventos ao campo "numero_mapa"
document
  .getElementById("numero_mapa")
  .addEventListener("change", function (event) {
    var numeroMapa = event.target.value;
    var database = firebase.database();
    var bairrosRef = database.ref("Bairros");

    bairrosRef.once("value", function (snapshot) {
      snapshot.forEach(function (childSnapshot) {
        var bairro = childSnapshot.key;
        var mapas = childSnapshot.val().Mapas;

        for (var key in mapas) {
          if (mapas.hasOwnProperty(key) && key == numeroMapa) {
            console.log(
              "O mapa " + numeroMapa + " pertence ao bairro: " + bairro
            );
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

  var database = firebase.database();
  var referenciaHistorico = database.ref(
    `Bairros/${bairro}/Mapas/${numeroMapa}/historico`
  );

  // Atualizar o histórico
  referenciaHistorico
    .push(dadosFormulario)
    .then(function () {
      console.log("Dados salvos com sucesso no Firebase Realtime Database.");
      document.getElementById("numero_mapa").value = "";
      document.getElementById("designado_para").value = "";
      document.getElementById("data_inicio").value = "";
      document.getElementById("data_conclusao").value = "";
      document.getElementById("bairro").value = "";
      alert("Dados salvos com sucesso!");
    })
    .catch(function (error) {
      console.error("Erro ao salvar os dados:", error);
      alert("Erro ao salvar os dados. Por favor, tente novamente.");
    });
});
