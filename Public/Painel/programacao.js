/*************************************************
 * 📦 CARREGAR CONFIGURAÇÕES DO FIRESTORE
 *************************************************/
async function carregarConfiguracoes() {
  const db = firebase.firestore();
  
  const config = {
    dirigentes: [],
    grupos: [],
    idosos: [],
    acompanhantes: []
  };

  try {
    // Carregar dirigentes
    const dirigentesSnap = await db
      .collection('escala-config')
      .doc('listas')
      .collection('dirigentes-sabado')
      .where('ativo', '==', true)
      .orderBy('ordem')
      .get();
    
    dirigentesSnap.forEach(doc => {
      config.dirigentes.push(doc.data().nome);
    });

    // Carregar grupos
    const gruposSnap = await db
      .collection('escala-config')
      .doc('listas')
      .collection('grupos-domingo')
      .where('ativo', '==', true)
      .orderBy('ordem')
      .get();
    
    gruposSnap.forEach(doc => {
      config.grupos.push(doc.data().nome);
    });

    // Carregar idosos
    const idososSnap = await db
      .collection('escala-config')
      .doc('listas')
      .collection('idosos')
      .where('ativo', '==', true)
      .orderBy('ordem')
      .get();
    
    idososSnap.forEach(doc => {
      config.idosos.push(doc.data().nome);
    });

    // Carregar acompanhantes
    const acompanhantesSnap = await db
      .collection('escala-config')
      .doc('listas')
      .collection('acompanhantes')
      .where('ativo', '==', true)
      .orderBy('ordem')
      .get();
    
    acompanhantesSnap.forEach(doc => {
      config.acompanhantes.push(doc.data().nome);
    });

    return config;
  } catch (error) {
    console.error('❌ Erro ao carregar configurações:', error);
    throw error;
  }
}

/*************************************************
 * 📊 CARREGAR ESTADO ATUAL DOS ÍNDICES
 *************************************************/
async function carregarEstadoAtual() {
  const db = firebase.firestore();
  
  try {
    const doc = await db.collection('escala-config').doc('estado-atual').get();
    
    if (!doc.exists) {
      // Primeira vez - começar do zero
      return {
        dirigenteSabado: 0,
        grupoDomingo: 0,
        idoso: 0,
        acompanhante: 0
      };
    }

    return doc.data();
  } catch (error) {
    console.error('❌ Erro ao carregar estado:', error);
    // Se der erro, começar do zero
    return {
      dirigenteSabado: 0,
      grupoDomingo: 0,
      idoso: 0,
      acompanhante: 0
    };
  }
}

/*************************************************
 * 💾 SALVAR ESTADO ATUAL DOS ÍNDICES
 *************************************************/
async function salvarEstadoAtual(estado, ano) {
  const db = firebase.firestore();
  
  try {
    await db.collection('escala-config').doc('estado-atual').set({
      dirigenteSabado: estado.dirigenteSabado,
      grupoDomingo: estado.grupoDomingo,
      idoso: estado.idoso,
      acompanhante: estado.acompanhante,
      ultimoAnoGerado: ano,
      dataUltimaGeracao: firebase.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Estado salvo:', estado);
  } catch (error) {
    console.error('❌ Erro ao salvar estado:', error);
    throw error;
  }
}

/*************************************************
 * 🔢 FUNÇÕES DE ROTACIONAMENTO
 *************************************************/
function proximoItem(lista, index) {
  if (!lista || lista.length === 0) {
    throw new Error('Lista vazia');
  }
  
  const item = lista[index];
  const novoIndex = (index + 1) % lista.length;
  
  return { item, novoIndex };
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
 * 📂 REFERÊNCIA DO ANO
 *************************************************/
function refAno(db, ano) {
  return db
    .collection("programacao")
    .doc(String(ano))
    .collection("agendamentos");
}

/*************************************************
 * 💾 FUNÇÕES DE SALVAMENTO
 *************************************************/
function salvarSabado(db, ano, data, dirigente) {
  const id = gerarDocId("sabado", data);
  return refAno(db, ano).doc(id).set({ dirigente });
}

function salvarDomingo(db, ano, data, grupo) {
  const id = gerarDocId("domingo", data);
  return refAno(db, ano).doc(id).set({ grupo });
}

function salvarIdosos(db, ano, data, idoso, acompanhante) {
  const id = gerarDocId("idosos", data);
  return refAno(db, ano).doc(id).set({ idoso, acompanhante });
}

/*************************************************
 * 🚀 FUNÇÃO PRINCIPAL – GERAR E SALVAR ANO
 *************************************************/
async function gerarESalvarAno(ano, opcoes = {}) {
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

  // Carregar configurações do Firestore
  console.log("📦 Carregando configurações...");
  let config;
  try {
    config = await carregarConfiguracoes();
  } catch (error) {
    alert("❌ Erro ao carregar configurações: " + error.message);
    return;
  }

  // Validar configurações
  if (config.dirigentes.length === 0) {
    alert("❌ Nenhum dirigente cadastrado! Cadastre pelo menos um dirigente.");
    return;
  }
  if (config.grupos.length === 0) {
    alert("❌ Nenhum grupo cadastrado! Cadastre pelo menos um grupo.");
    return;
  }
  if (config.idosos.length === 0) {
    alert("❌ Nenhum idoso cadastrado! Cadastre pelo menos um idoso.");
    return;
  }
  if (config.acompanhantes.length === 0) {
    alert("❌ Nenhum acompanhante cadastrado! Cadastre pelo menos um acompanhante.");
    return;
  }

  console.log("✅ Configurações carregadas:", config);

  // Carregar estado atual (índices)
  const resetarIndices = opcoes.resetar || false;
  let indices;
  
  if (resetarIndices) {
    indices = {
      dirigenteSabado: 0,
      grupoDomingo: 0,
      idoso: 0,
      acompanhante: 0
    };
    console.log("🔄 Resetando índices para o início");
  } else {
    indices = await carregarEstadoAtual();
    console.log("📊 Índices atuais:", indices);
  }

  if (
    !confirm(
      `Isso vai GERAR ou SOBRESCREVER a escala do ano ${ano}.\n\n` +
      `Próximos na escala:\n` +
      `• Dirigente: ${config.dirigentes[indices.dirigenteSabado]}\n` +
      `• Grupo: ${config.grupos[indices.grupoDomingo]}\n` +
      `• Idoso: ${config.idosos[indices.idoso]}\n` +
      `• Acompanhante: ${config.acompanhantes[indices.acompanhante]}\n\n` +
      `Deseja continuar?`
    )
  ) {
    return;
  }

  console.log(`🚀 Gerando escala para ${ano}`);

  try {
    let totalSabados = 0;
    let totalDomingos = 0;

    for (let mes = 0; mes < 12; mes++) {
      const diasNoMes = new Date(ano, mes + 1, 0).getDate();

      for (let dia = 1; dia <= diasNoMes; dia++) {
        const data = new Date(ano, mes, dia);
        data.setHours(0, 0, 0, 0);

        const dow = data.getDay();

        // 🔹 SÁBADO
        if (dow === 6) {
          const { item: dirigente, novoIndex: novoDirigenteIndex } = 
            proximoItem(config.dirigentes, indices.dirigenteSabado);
          
          const { item: idoso, novoIndex: novoIdosoIndex } = 
            proximoItem(config.idosos, indices.idoso);
          
          const { item: acompanhante, novoIndex: novoAcompanhanteIndex } = 
            proximoItem(config.acompanhantes, indices.acompanhante);

          await salvarSabado(db, ano, data, dirigente);
          await salvarIdosos(db, ano, data, idoso, acompanhante);

          indices.dirigenteSabado = novoDirigenteIndex;
          indices.idoso = novoIdosoIndex;
          indices.acompanhante = novoAcompanhanteIndex;
          
          totalSabados++;
        }

        // 🔹 DOMINGO
        if (dow === 0) {
          const { item: grupo, novoIndex: novoGrupoIndex } = 
            proximoItem(config.grupos, indices.grupoDomingo);

          await salvarDomingo(db, ano, data, grupo);

          indices.grupoDomingo = novoGrupoIndex;
          totalDomingos++;
        }
      }
    }

    // Salvar estado final
    await salvarEstadoAtual(indices, ano);

    console.log(`✅ Escala ${ano} salva com sucesso`);
    console.log(`📊 Total: ${totalSabados} sábados, ${totalDomingos} domingos`);
    
    alert(
      `✅ Escala do ano ${ano} salva com sucesso!\n\n` +
      `📊 Estatísticas:\n` +
      `• ${totalSabados} sábados programados\n` +
      `• ${totalDomingos} domingos programados\n\n` +
      `Próximos para ${ano + 1}:\n` +
      `• Dirigente: ${config.dirigentes[indices.dirigenteSabado]}\n` +
      `• Grupo: ${config.grupos[indices.grupoDomingo]}\n` +
      `• Idoso: ${config.idosos[indices.idoso]}\n` +
      `• Acompanhante: ${config.acompanhantes[indices.acompanhante]}`
    );
    
    // Atualizar visualização do status
    if (typeof carregarEstado === 'function') {
      carregarEstado();
    }

  } catch (error) {
    console.error("❌ Erro ao gerar escala:", error);
    alert(`❌ Erro ao gerar escala: ${error.message}`);
  }
}

/*************************************************
 * 🖱️ BOTÃO DE AÇÃO
 *************************************************/
document.addEventListener('DOMContentLoaded', function() {
  const btnGerar = document.getElementById("gerarFirestore");
  
  if (btnGerar) {
    btnGerar.addEventListener("click", () => {
      const ano = Number(document.getElementById("ano").value);
      const resetar = confirm("Deseja começar do zero? (Clique em 'Cancelar' para continuar de onde parou)");
      gerarESalvarAno(ano, { resetar });
    });
  }
});