// 🔹 Login automático e carregamento inicial
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    console.log("Usuário autenticado, iniciando carregamento de dados...");
    obterSemana(0);
  } else {
    console.log("Realizando login automático...");
    firebase
      .auth()
      .signInWithEmailAndPassword("williamsilvatj@hotmail.com", "356473")
      .then(() => {
        console.log("Login automático realizado com sucesso");
        obterSemana(0);
      })
      .catch((error) => {
        console.error("Erro no login:", error);
      });
  }
});

// 🔹 Controle de navegação entre semanas
let offsetSemanas = 0;

// Função principal para exibir a semana e carregar dados correspondentes
function obterSemana(offset = 0) {
  const hoje = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );
  const diaSemana = hoje.getDay(); // 0 = domingo, 6 = sábado

  // Segunda-feira da semana base
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(
    hoje.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1) + offset * 7
  );

  // Domingo da mesma semana
  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(inicioSemana.getDate() + 6);

  // Nomes dos meses
  const meses = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];

  const formatarData = (data) =>
    `${data.getDate()} de ${meses[data.getMonth()]}`;

  // Atualiza o texto exibido
  document.getElementById(
    "semana-atual"
  ).textContent = `Semana de ${formatarData(
    inicioSemana
  )} a ${formatarData(fimSemana)}`;

  // Carrega dados do Firebase da semana exibida
  carregarDados(inicioSemana);
}

// 🔹 Atualiza os dados da semana (sábado, domingo, idosos)
function carregarDados(inicioSemana = null) {
  const database = firebase.database();

  const baseDate =
    inicioSemana ||
    new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const segunda = new Date(baseDate);

  const sabado = new Date(segunda);
  sabado.setDate(segunda.getDate() + 5);

  const domingo = new Date(segunda);
  domingo.setDate(segunda.getDate() + 6);

  // Formata datas no padrão DD-MM-YYYY
  const formatarData = (data) => {
    const dia = String(data.getDate()).padStart(2, "0");
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const ano = data.getFullYear();
    return `${dia}-${mes}-${ano}`;
  };

  const dataSabado = formatarData(sabado);
  const dataDomingo = formatarData(domingo);

  console.log("🔸 Carregando dados de:", dataSabado, "até", dataDomingo);

  // Limpa os campos antes de carregar novos
  document.getElementById("sabado").textContent = "-";
  document.getElementById("domingo").textContent = "-";
  document.getElementById("idoso").textContent = "-";
  document.getElementById("acompanhate").textContent = "-";

  // 🔸 Busca dados no Firebase
  database.ref(`tabela/sabado/${dataSabado}/dirigente`).once("value").then((snapshot) => {
    document.getElementById("sabado").textContent = snapshot.val() || "-";
  });

  database.ref(`tabela/domingo/${dataDomingo}/grupo`).once("value").then((snapshot) => {
    document.getElementById("domingo").textContent = snapshot.val() || "-";
  });

  database.ref(`tabela/idosos/${dataSabado}/idoso`).once("value").then((snapshot) => {
    document.getElementById("idoso").textContent = snapshot.val() || "-";
  });

  database.ref(`tabela/idosos/${dataSabado}/acompanhante`).once("value").then((snapshot) => {
    document.getElementById("acompanhate").textContent = snapshot.val() || "-";
  });
}

// 🔹 Configura os botões de navegação
document.addEventListener("DOMContentLoaded", () => {
  const btnAnterior = document.getElementById("semana-anterior");
  const btnProxima = document.getElementById("semana-proxima");

  if (btnAnterior && btnProxima) {
    btnAnterior.addEventListener("click", () => {
      offsetSemanas--;
      obterSemana(offsetSemanas);
    });

    btnProxima.addEventListener("click", () => {
      offsetSemanas++;
      obterSemana(offsetSemanas);
    });
  }

  // Carrega a semana atual ao abrir
  obterSemana(0);
});
