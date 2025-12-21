/*************************************************
 * 🔐 AUTENTICAÇÃO
 *************************************************/
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    console.log("✅ Usuário autenticado");
  } else {
    console.log("🔓 Realizando login automático...");
    firebase
      .auth()
      .signInWithEmailAndPassword(
        "williamsilvatj@hotmail.com",
        "356473"
      )
      .then(() => console.log("✅ Login automático realizado"))
      .catch((error) => console.error("❌ Erro no login:", error));
  }
});

/*************************************************
 * 📅 CONTROLE DE SEMANAS
 *************************************************/
let offsetSemanas = 0;

/*************************************************
 * 🚀 INICIALIZAÇÃO DA TELA
 *************************************************/
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 DOM pronto, iniciando carregamento");
  configurarBotoes();
  obterSemana(0);
});

/*************************************************
 * ⏪⏩ BOTÕES DE NAVEGAÇÃO
 *************************************************/
function configurarBotoes() {
  const btnAnterior = document.getElementById("semana-anterior");
  const btnProxima = document.getElementById("semana-proxima");

  if (!btnAnterior || !btnProxima) return;

  btnAnterior.addEventListener("click", () => {
    offsetSemanas--;
    obterSemana(offsetSemanas);
  });

  btnProxima.addEventListener("click", () => {
    offsetSemanas++;
    obterSemana(offsetSemanas);
  });
}

/*************************************************
 * 📆 OBTÉM SEMANA ATUAL
 *************************************************/
function obterSemana(offset = 0) {
  console.log("📆 Carregando semana", offset);

  const hoje = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "America/Sao_Paulo",
    })
  );

  const diaSemana = hoje.getDay(); // 0 = domingo

  // Segunda-feira
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(
    hoje.getDate() -
      (diaSemana === 0 ? 6 : diaSemana - 1) +
      offset * 7
  );

  // Domingo
  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(inicioSemana.getDate() + 6);

  atualizarTextoSemana(inicioSemana, fimSemana);
  carregarDados(inicioSemana);
}

/*************************************************
 * 📝 ATUALIZA TEXTO DA SEMANA
 *************************************************/
function atualizarTextoSemana(inicio, fim) {
  const el = document.getElementById("semana-atual");
  if (!el) return;

  const meses = [
    "janeiro","fevereiro","março","abril","maio","junho",
    "julho","agosto","setembro","outubro","novembro","dezembro",
  ];

  const formatar = (d) =>
    `${d.getDate()} de ${meses[d.getMonth()]}`;

  el.textContent = `Semana de ${formatar(inicio)} a ${formatar(fim)}`;
}

/*************************************************
 * 🆔 GERA ID DO DOCUMENTO
 *************************************************/
function docId(tipo, data) {
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${tipo}_${y}-${m}-${d}`;
}

/*************************************************
 * 📦 CARREGA DADOS DO FIRESTORE (ATUALIZADO)
 *************************************************/
function carregarDados(inicioSemana) {
  console.log("📦 Carregando dados Firestore");

  const db = firebase.firestore();

  const segunda = new Date(inicioSemana);
  segunda.setHours(0, 0, 0, 0);

  const sabado = new Date(segunda);
  sabado.setDate(segunda.getDate() + 5);

  const domingo = new Date(segunda);
  domingo.setDate(segunda.getDate() + 6);

  // Obter o ano para acessar a coleção correta
  const ano = sabado.getFullYear();

  const sabadoEl = document.getElementById("sabado");
  const domingoEl = document.getElementById("domingo");
  const idosoEl = document.getElementById("idoso");
  const acompanhanteEl = document.getElementById("acompanhante");

  // Limpar campos
  if (sabadoEl) sabadoEl.textContent = "-";
  if (domingoEl) domingoEl.textContent = "-";
  if (idosoEl) idosoEl.textContent = "-";
  if (acompanhanteEl) acompanhanteEl.textContent = "-";

  // 🔹 SÁBADO - Nova estrutura
  db.collection("programacao")
    .doc(String(ano))
    .collection("agendamentos")
    .doc(docId("sabado", sabado))
    .get()
    .then((doc) => {
      if (doc.exists && sabadoEl) {
        sabadoEl.textContent = doc.data().dirigente || "-";
        console.log("✅ Dirigente sábado:", doc.data().dirigente);
      } else {
        console.log("⚠️ Nenhum dirigente encontrado para este sábado");
      }
    })
    .catch((error) => {
      console.error("❌ Erro ao buscar sábado:", error);
      if (sabadoEl) sabadoEl.textContent = "Erro";
    });

  // 🔹 DOMINGO - Nova estrutura
  db.collection("programacao")
    .doc(String(ano))
    .collection("agendamentos")
    .doc(docId("domingo", domingo))
    .get()
    .then((doc) => {
      if (doc.exists && domingoEl) {
        domingoEl.textContent = doc.data().grupo || "-";
        console.log("✅ Grupo domingo:", doc.data().grupo);
      } else {
        console.log("⚠️ Nenhum grupo encontrado para este domingo");
      }
    })
    .catch((error) => {
      console.error("❌ Erro ao buscar domingo:", error);
      if (domingoEl) domingoEl.textContent = "Erro";
    });

  // 🔹 IDOSOS - Nova estrutura
  db.collection("programacao")
    .doc(String(ano))
    .collection("agendamentos")
    .doc(docId("idosos", sabado))
    .get()
    .then((doc) => {
      if (!doc.exists) {
        console.log("⚠️ Nenhum idoso encontrado para este sábado");
        return;
      }

      const d = doc.data();

      if (idosoEl) {
        idosoEl.textContent = d.idoso || "-";
        console.log("✅ Idoso:", d.idoso);
      }

      if (acompanhanteEl) {
        acompanhanteEl.textContent = d.acompanhante || "-";
        console.log("✅ Acompanhante:", d.acompanhante);
      }
    })
    .catch((error) => {
      console.error("❌ Erro ao buscar idosos:", error);
      if (idosoEl) idosoEl.textContent = "Erro";
      if (acompanhanteEl) acompanhanteEl.textContent = "Erro";
    });
}