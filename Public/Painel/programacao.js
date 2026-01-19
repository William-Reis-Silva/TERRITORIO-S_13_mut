/*************************************************
 * 📁 REFERÊNCIA PADRÃO DO ANO
 *************************************************/
function refAno(db, ano) {
  return db
    .collection("programacao")
    .doc(String(ano))
    .collection("agendamentos");
}

/*************************************************
 * 🆔 GERAR ID DO DOCUMENTO
 *************************************************/
function gerarDocId(tipo, data) {
  const yyyy = data.getFullYear();
  const mm = String(data.getMonth() + 1).padStart(2, "0");
  const dd = String(data.getDate()).padStart(2, "0");
  return `${tipo}_${yyyy}-${mm}-${dd}`;
}

/*************************************************
 * 📦 CARREGAR CONFIGURAÇÕES DO FIRESTORE
 * (OBRIGATÓRIA – DEVE FICAR NO TOPO DO ARQUIVO)
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
    const base = db
      .collection("escala-config")
      .doc("listas");

    const mapas = [
      { col: "dirigentes-sabado", key: "dirigentes" },
      { col: "grupos-domingo", key: "grupos" },
      { col: "idosos", key: "idosos" },
      { col: "acompanhantes", key: "acompanhantes" }
    ];

    for (const m of mapas) {
      const snap = await base
        .collection(m.col)
        .where("ativo", "==", true)
        .orderBy("ordem")
        .get();

      snap.forEach(doc => {
        config[m.key].push(doc.data().nome);
      });
    }

    return config;
  } catch (err) {
    console.error("Erro ao carregar configurações:", err);
    throw err;
  }
}

/*************************************************
 * 📅 UTILITÁRIOS DE DATA
 *************************************************/
function proximoDiaSemana(diaSemana) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const data = new Date(hoje);
  const diff = (7 + diaSemana - hoje.getDay()) % 7;
  data.setDate(hoje.getDate() + (diff === 0 ? 7 : diff));

  return data;
}

function extrairDataDoId(id) {
  // ex: sabado_2025-01-04
  return new Date(id.split("_")[1]);
}

/*************************************************
 * 📖 CARREGAR ÚLTIMOS AGENDAMENTOS (1 leitura)
 *************************************************/
async function carregarUltimosAgendamentos(db, ano, dataLimite) {
  const snap = await db
    .collection("programacao")
    .doc(String(ano))
    .collection("agendamentos")
    .get();

  const ultimos = {
    sabado: null,
    domingo: null,
    idosos: null
  };

  snap.forEach(doc => {
    const id = doc.id;
    const data = extrairDataDoId(id);

    if (data >= dataLimite) return;

    if (id.startsWith("sabado_")) {
      if (!ultimos.sabado || data > ultimos.sabado.data) {
        ultimos.sabado = {
          data,
          dirigente: doc.data().dirigente
        };
      }
    }

    if (id.startsWith("domingo_")) {
      if (!ultimos.domingo || data > ultimos.domingo.data) {
        ultimos.domingo = {
          data,
          grupo: doc.data().grupo
        };
      }
    }

    if (id.startsWith("idosos_")) {
      if (!ultimos.idosos || data > ultimos.idosos.data) {
        ultimos.idosos = {
          data,
          idoso: doc.data().idoso,
          acompanhante: doc.data().acompanhante
        };
      }
    }
  });

  return ultimos;
}

/*************************************************
 * 🔁 PRÓXIMO ÍNDICE (à prova de remoção)
 *************************************************/
function proximoIndex(lista, ultimoNome) {
  const idx = lista.indexOf(ultimoNome);
  if (idx === -1) return 0;
  return (idx + 1) % lista.length;
}

/*************************************************
 * 👀 GERAR PREVIEW VISUAL (SEM SALVAR)
 *************************************************/
function gerarPreview(ano, dataInicio, config, indices) {
  const preview = [];
  let { dir, grp, ido, aco } = indices;

  for (let mes = dataInicio.getMonth(); mes < 12; mes++) {
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();

    for (let dia = 1; dia <= diasNoMes; dia++) {
      const data = new Date(ano, mes, dia);
      data.setHours(0, 0, 0, 0);

      if (data < dataInicio) continue;

      const dow = data.getDay();

      if (dow === 6) {
        preview.push({
          tipo: "Sábado",
          data,
          dirigente: config.dirigentes[dir],
          idoso: config.idosos[ido],
          acompanhante: config.acompanhantes[aco]
        });

        dir = (dir + 1) % config.dirigentes.length;
        ido = (ido + 1) % config.idosos.length;
        aco = (aco + 1) % config.acompanhantes.length;
      }

      if (dow === 0) {
        preview.push({
          tipo: "Domingo",
          data,
          grupo: config.grupos[grp]
        });

        grp = (grp + 1) % config.grupos.length;
      }

      if (preview.length >= 10) return preview; // limita preview
    }
  }

  return preview;
}

/*************************************************
 * 🚀 FUNÇÃO PRINCIPAL – REGERAR A PARTIR DO PRÓXIMO FIM DE SEMANA
 *************************************************/
async function regerarAPartirDoProximoFimDeSemana(ano) {
  const db = firebase.firestore();

  try {
    const config = await carregarConfiguracoes();

    const dataInicio = proximoDiaSemana(6); // SEMPRE sábado
    dataInicio.setHours(0, 0, 0, 0);
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const ultimos = await carregarUltimosAgendamentos(db, ano, hoje);

    const indices = {
      dir: ultimos.sabado
        ? proximoIndex(config.dirigentes, ultimos.sabado.dirigente)
        : 0,
      grp: ultimos.domingo
        ? proximoIndex(config.grupos, ultimos.domingo.grupo)
        : 0,
      ido: ultimos.idosos
        ? proximoIndex(config.idosos, ultimos.idosos.idoso)
        : 0,
      aco: ultimos.idosos
        ? proximoIndex(config.acompanhantes, ultimos.idosos.acompanhante)
        : 0
    };

    // 👀 PREVIEW
    const preview = gerarPreview(ano, dataInicio, config, indices);

    let texto = "📋 PREVIEW DAS PRÓXIMAS ESCALAS\n\n";
    preview.forEach(p => {
      texto += `${p.tipo} – ${p.data.toLocaleDateString("pt-BR")}\n`;
      if (p.tipo === "Sábado") {
        texto += `• Dirigente: ${p.dirigente}\n`;
        texto += `• Idoso: ${p.idoso}\n`;
        texto += `• Acompanhante: ${p.acompanhante}\n\n`;
      } else {
        texto += `• Grupo: ${p.grupo}\n\n`;
      }
    });

    if (!confirm(texto + "Deseja aplicar essas mudanças?")) return;

    // 💾 SALVAR NO FIRESTORE
    for (let mes = dataInicio.getMonth(); mes < 12; mes++) {
      const diasNoMes = new Date(ano, mes + 1, 0).getDate();
      const batch = db.batch();

      for (let dia = 1; dia <= diasNoMes; dia++) {
        const data = new Date(ano, mes, dia);
        data.setHours(0, 0, 0, 0);

        if (data < dataInicio) continue;

        const dow = data.getDay();

        if (dow === 6) {
          // Salvar dirigente do sábado
          batch.set(
            refAno(db, ano).doc(gerarDocId("sabado", data)),
            { dirigente: config.dirigentes[indices.dir] }
          );

          // Salvar idosos
          batch.set(
            refAno(db, ano).doc(gerarDocId("idosos", data)),
            {
              idoso: config.idosos[indices.ido],
              acompanhante: config.acompanhantes[indices.aco]
            }
          );

          // Incrementar DEPOIS de salvar
          indices.dir = (indices.dir + 1) % config.dirigentes.length;
          indices.ido = (indices.ido + 1) % config.idosos.length;
          indices.aco = (indices.aco + 1) % config.acompanhantes.length;
        }

        if (dow === 0) {
          // Salvar domingo
          batch.set(
            refAno(db, ano).doc(gerarDocId("domingo", data)),
            { grupo: config.grupos[indices.grp] }
          );

          // Incrementar DEPOIS de salvar
          indices.grp = (indices.grp + 1) % config.grupos.length;
        }
      }

      await batch.commit();
    }

    alert("✅ Escala regenerada com sucesso!");
  } catch (erro) {
    console.error("Erro ao regerar escala:", erro);
    alert("❌ Erro ao salvar: " + erro.message);
  }
}

/*************************************************
 * 🖱️ BOTÃO
 *************************************************/
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("regerarFuturo");

  if (btn) {
    btn.addEventListener("click", () => {
      const ano = Number(document.getElementById("ano").value);
      regerarAPartirDoProximoFimDeSemana(ano);
    });
  }
});