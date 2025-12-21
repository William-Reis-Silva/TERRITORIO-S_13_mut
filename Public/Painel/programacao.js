/*************************************************
 * 📌 CONFIGURAÇÃO DA ESCALA
 *************************************************/
const escala = {
  sabado: {
    dirigentes: [
      "Jhony",
      "Joebel",
      "Werlley",
      "Wemerson",
      "Lucas",
      "Lidinei",
      "Matheus",
      "Thalles",
      "William",
    ],
    index: 0,
  },

  domingo: {
    grupos: [
      "Grupo Eldorado",
      "Grupo Primavera",
      "Grupo Timirim",
    ],
    index: 0,
  },

  idosos: {
    idosos: [
      "Paulo Bezerra / Cleuza Armine",
      "Cecilia Martins",
      "Guiomar / Osvaldo",
      "Aparecida Roque",
      "Maria Martins",
    ],
    acompanhantes: [
      "Werlley",
      "William",
      "Thalles",
      "Matheus",
      "Lidinei",
      "Lucas",
      "Wemerson",
      "Joebel",
      "Jhony",
    ],
    idosoIndex: 0,
    acompanhanteIndex: 0,
  },
};

/*************************************************
 * 🔄 RESET DA ESCALA (NOVO ANO)
 *************************************************/
function resetarEscala() {
  escala.sabado.index = 0;
  escala.domingo.index = 0;
  escala.idosos.idosoIndex = 0;
  escala.idosos.acompanhanteIndex = 0;
}

/*************************************************
 * 🔢 FUNÇÕES DE ROTACIONAMENTO
 *************************************************/
function proximoDirigenteSabado() {
  const { dirigentes, index } = escala.sabado;
  const nome = dirigentes[index];
  escala.sabado.index = (index + 1) % dirigentes.length;
  return nome;
}

function proximoGrupoDomingo() {
  const { grupos, index } = escala.domingo;
  const grupo = grupos[index];
  escala.domingo.index = (index + 1) % grupos.length;
  return grupo;
}

function proximoIdoso() {
  const i = escala.idosos.idosoIndex;
  const a = escala.idosos.acompanhanteIndex;

  const resultado = {
    idoso: escala.idosos.idosos[i],
    acompanhante: escala.idosos.acompanhantes[a],
  };

  escala.idosos.idosoIndex =
    (i + 1) % escala.idosos.idosos.length;

  escala.idosos.acompanhanteIndex =
    (a + 1) % escala.idosos.acompanhantes.length;

  return resultado;
}

/*************************************************
 * 🆔 GERA ID DO DOCUMENTO
 *************************************************/
function gerarDocId(tipo, data) {
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${tipo}_${y}-${m}-${d}`;
}

/*************************************************
 * 📂 REFERÊNCIA DO ANO (CORRIGIDA)
 *************************************************/
function refAno(db, ano) {
  // MUDANÇA: Agora usa a estrutura programacao/{ano}/agendamentos
  return db
    .collection("programacao")
    .doc(String(ano))
    .collection("agendamentos");
}

/*************************************************
 * 💾 FUNÇÕES DE SALVAMENTO (OTIMIZADO)
 *************************************************/
function salvarSabado(db, ano, data, dirigente) {
  const id = gerarDocId("sabado", data);

  return refAno(db, ano).doc(id).set({
    dirigente
  });
}

function salvarDomingo(db, ano, data, grupo) {
  const id = gerarDocId("domingo", data);

  return refAno(db, ano).doc(id).set({
    grupo
  });
}

function salvarIdosos(db, ano, data, idosos) {
  const id = gerarDocId("idosos", data);

  return refAno(db, ano).doc(id).set({
    idoso: idosos.idoso,
    acompanhante: idosos.acompanhante
  });
}

/*************************************************
 * 🚀 FUNÇÃO PRINCIPAL – GERAR E SALVAR ANO
 *************************************************/
async function gerarESalvarAno(ano) {
  const db = firebase.firestore();
  const auth = firebase.auth();

  // Verificar autenticação
  const user = auth.currentUser;
  if (!user) {
    alert("Erro: Você precisa estar autenticado para gerar a escala.");
    console.error("❌ Usuário não autenticado");
    return;
  }

  console.log("✅ Usuário autenticado:", user.uid);

  // Verificar permissões do usuário
  try {
    const userDoc = await db.collection("usuarios").doc(user.uid).get();
    if (!userDoc.exists) {
      alert("Erro: Documento do usuário não encontrado.");
      console.error("❌ Documento do usuário não existe");
      return;
    }

    const userData = userDoc.data();
    console.log("📋 Dados do usuário:", userData);

    if (!userData.isAdmin) {
      alert("Erro: Você precisa ser administrador para gerar a escala.");
      console.error("❌ Usuário não é admin");
      return;
    }

    console.log("✅ Usuário é admin, prosseguindo...");
  } catch (error) {
    console.error("❌ Erro ao verificar permissões:", error);
    alert("Erro ao verificar permissões: " + error.message);
    return;
  }

  if (!ano || ano < 2000) {
    alert("Informe um ano válido");
    return;
  }

  if (
    !confirm(
      `Isso vai GERAR ou SOBRESCREVER a escala do ano ${ano}. Deseja continuar?`
    )
  ) {
    return;
  }

  console.log(`🚀 Gerando escala para ${ano}`);
  resetarEscala();

  try {
    for (let mes = 0; mes < 12; mes++) {
      const diasNoMes = new Date(ano, mes + 1, 0).getDate();

      for (let dia = 1; dia <= diasNoMes; dia++) {
        const data = new Date(ano, mes, dia);
        data.setHours(0, 0, 0, 0);

        const dow = data.getDay();

        // 🔹 SÁBADO
        if (dow === 6) {
          await salvarSabado(
            db,
            ano,
            data,
            proximoDirigenteSabado()
          );

          await salvarIdosos(
            db,
            ano,
            data,
            proximoIdoso()
          );
        }

        // 🔹 DOMINGO
        if (dow === 0) {
          await salvarDomingo(
            db,
            ano,
            data,
            proximoGrupoDomingo()
          );
        }
      }
    }

    console.log(`✅ Escala ${ano} salva com sucesso`);
    alert(`Escala do ano ${ano} salva com sucesso!`);
  } catch (error) {
    console.error("❌ Erro ao gerar escala:", error);
    alert(`Erro ao gerar escala: ${error.message}`);
  }
}

/*************************************************
 * 🖱️ BOTÃO DE AÇÃO
 *************************************************/
document
  .getElementById("gerarFirestore")
  .addEventListener("click", () => {
    const ano = Number(document.getElementById("ano").value);
    gerarESalvarAno(ano);
  });