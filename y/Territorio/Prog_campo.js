

firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    console.log("Usuário autenticado, iniciando carregamento de dados...");
    carregarDados();
  } else {
    console.log("Realizando login automático...");
    firebase
      .auth()
      .signInWithEmailAndPassword("williamsilvatj@hotmail.com", "356473")
      .then(() => {
        console.log("Login automático realizado com sucesso");
        carregarDados();
      })
      .catch((error) => {
        console.error("Erro no login:", error);
      });
  }
});
function obterSemanaAtual() {
  const hoje = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const diaSemana = hoje.getDay(); // 0 = domingo, 6 = sábado

  // Encontrar a segunda-feira mais próxima (início da semana)
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));

  // Encontrar o domingo da mesma semana (fim da semana)
  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(inicioSemana.getDate() + 6);

  // Formatar as datas no estilo "17 de fevereiro"
  function formatarData(data) {
    const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    return `${data.getDate()} de ${meses[data.getMonth()]}`;
  }

  // Exibir a semana no elemento HTML
  document.getElementById("semana-atual").textContent = `Semana de ${formatarData(inicioSemana)} a ${formatarData(fimSemana)}`;
}

// Executar a função quando a página carregar
document.addEventListener("DOMContentLoaded", obterSemanaAtual);

// Função para obter a data do próximo sábado e domingo
function obterDatasFuturas() {
  // Obtém a data atual no fuso horário do Brasil
  const hoje = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );
  hoje.setHours(0, 0, 0, 0); // Zera as horas para evitar problemas com horário de verão

  const diaSemana = hoje.getDay(); // 0 (domingo) até 6 (sábado)

  // Encontra o sábado da semana atual
  let diasParaSabado;
  if (diaSemana === 6) {
    // Se hoje é sábado
    diasParaSabado = 0; // Usa o sábado atual
  } else if (diaSemana === 0) {
    // Se hoje é domingo
    diasParaSabado = -1; // Usa o sábado que passou
  } else {
    diasParaSabado = 6 - diaSemana; // Dias até o sábado desta semana
  }

  // Encontra o domingo da semana atual
  let diasParaDomingo;
  if (diaSemana === 0) {
    // Se hoje é domingo
    diasParaDomingo = 0; // Usa o domingo atual
  } else {
    diasParaDomingo = -diaSemana; // Dias até o domingo que passou
  }

  // Calcula a data do sábado
  const dataSabado = new Date(hoje);
  dataSabado.setDate(hoje.getDate() + diasParaSabado);

  // Calcula a data do domingo
  const dataDomingo = new Date(hoje);
  dataDomingo.setDate(hoje.getDate() + diasParaDomingo);

  // Formata as datas no padrão DD-MM-YYYY
  const formatarData = (data) => {
    const dia = String(data.getDate()).padStart(2, "0");
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const ano = data.getFullYear();
    return `${dia}-${mes}-${ano}`;
  };

  const dataFormatadaSabado = formatarData(dataSabado);
  const dataFormatadaDomingo = formatarData(dataDomingo);

  console.log("Sábado desta semana:", dataFormatadaSabado);
  console.log("Domingo desta semana:", dataFormatadaDomingo);

  return { sabado: dataFormatadaSabado, domingo: dataFormatadaDomingo };
}
// Função para carregar os dados do Firebase dinamicamente
function carregarDados() {
  const database = firebase.database();
  const datas = obterDatasFuturas();

  database
    .ref(`tabela/sabado/${datas.sabado}/dirigente`)
    .once("value")
    .then((snapshot) => {
      document.getElementById("sabado").textContent = snapshot.val() || "-";
    });

  database
    .ref(`tabela/domingo/${datas.domingo}/grupo`)
    .once("value")
    .then((snapshot) => {
      document.getElementById("domingo").textContent = snapshot.val() || "-";
    });

  database
    .ref(`tabela/idosos/${datas.sabado}/idoso`)
    .once("value")
    .then((snapshot) => {
      document.getElementById("idoso").textContent = snapshot.val() || "-";
    });

  database
    .ref(`tabela/idosos/${datas.sabado}/acompanhante`)
    .once("value")
    .then((snapshot) => {
      document.getElementById("acompanhate").textContent =
        snapshot.val() || "-";
    });
}
