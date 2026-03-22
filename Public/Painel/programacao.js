/*************************************************
 * 📦 CARREGAR CONFIGURAÇÕES DO SUPABASE
 *************************************************/
async function carregarConfiguracoes() {
  if (!window.supabaseClient || !window.currentCongregacaoId) {
    throw new Error('Supabase não inicializado ou Congregação não definida');
  }
  
  const config = { dirigentes: [], grupos: [], idosos: [], acompanhantes: [] };

  try {
    const { data: docSnap } = await window.supabaseClient.from("congregacoes")
      .select("config").eq("id", window.currentCongregacaoId).single();

    if (docSnap && docSnap.config) {
      if (docSnap.config.dirigentes) config.dirigentes = docSnap.config.dirigentes;
      if (docSnap.config.gruposDesignacao) config.grupos = docSnap.config.gruposDesignacao;
      if (docSnap.config.idosos) config.idosos = docSnap.config.idosos;
      if (docSnap.config.acompanhantes) config.acompanhantes = docSnap.config.acompanhantes;
    }
    
    // Fallback pra evitar que quebre, embora o ideal seja ter a config completa
    if (config.dirigentes.length === 0) config.dirigentes = ["Irmão 1", "Irmão 2"];
    if (config.idosos.length === 0) config.idosos = ["Idoso 1"];
    if (config.acompanhantes.length === 0) config.acompanhantes = ["Acompanhante 1"];

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

/*************************************************
 * 📖 CARREGAR ÚLTIMOS AGENDAMENTOS (1 leitura)
 *************************************************/
async function carregarUltimosAgendamentos(ano, dataLimite) {
  if (!window.supabaseClient) return { sabado: null, domingo: null, idosos: null };

  const { data: snap } = await window.supabaseClient.from("programacao")
    .select("*")
    .eq("congregacao_id", window.currentCongregacaoId)
    .gte("data_agendamento", `${ano}-01-01`)
    .lte("data_agendamento", `${ano}-12-31`);

  const ultimos = { sabado: null, domingo: null, idosos: null };

  if (!snap) return ultimos;

  snap.forEach(doc => {
    const data = new Date(doc.data_agendamento + 'T00:00:00');

    if (data >= dataLimite) return;

    if (doc.tipo === "sabado") {
      if (!ultimos.sabado || data > ultimos.sabado.data) {
        ultimos.sabado = { data, dirigente: doc.dirigente };
      }
    }

    if (doc.tipo === "domingo") {
      if (!ultimos.domingo || data > ultimos.domingo.data) {
        ultimos.domingo = { data, grupo: doc.grupo };
      }
    }

    if (doc.tipo === "idosos") {
      if (!ultimos.idosos || data > ultimos.idosos.data) {
        ultimos.idosos = { data, idoso: doc.idoso, acompanhante: doc.acompanhante };
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
          tipo: "sabado",
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
          tipo: "domingo",
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
  try {
    const config = await carregarConfiguracoes();

    const dataInicio = proximoDiaSemana(6); // SEMPRE sábado
    dataInicio.setHours(0, 0, 0, 0);
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const ultimos = await carregarUltimosAgendamentos(ano, hoje);

    const indices = {
      dir: ultimos.sabado ? proximoIndex(config.dirigentes, ultimos.sabado.dirigente) : 0,
      grp: ultimos.domingo ? proximoIndex(config.grupos, ultimos.domingo.grupo) : 0,
      ido: ultimos.idosos ? proximoIndex(config.idosos, ultimos.idosos.idoso) : 0,
      aco: ultimos.idosos ? proximoIndex(config.acompanhantes, ultimos.idosos.acompanhante) : 0
    };

    // 👀 PREVIEW
    const preview = gerarPreview(ano, dataInicio, config, indices);

    let texto = "📋 PREVIEW DAS PRÓXIMAS ESCALAS\n\n";
    preview.forEach(p => {
      texto += `${p.tipo.toUpperCase()} – ${p.data.toLocaleDateString("pt-BR")}\n`;
      if (p.tipo === "sabado") {
        texto += `• Dirigente: ${p.dirigente}\n`;
        texto += `• Idoso: ${p.idoso}\n`;
        texto += `• Acompanhante: ${p.acompanhante}\n\n`;
      } else {
        texto += `• Grupo: ${p.grupo}\n\n`;
      }
    });

    if (!confirm(texto + "Deseja aplicar essas mudanças?")) return;

    // 💾 SALVAR NO SUPABASE
    const agendamentosParaSalvar = [];

    for (let mes = dataInicio.getMonth(); mes < 12; mes++) {
      const diasNoMes = new Date(ano, mes + 1, 0).getDate();

      for (let dia = 1; dia <= diasNoMes; dia++) {
        const data = new Date(ano, mes, dia);
        data.setHours(0, 0, 0, 0);

        if (data < dataInicio) continue;

        const dow = data.getDay();
        const dataFormatada = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

        if (dow === 6) {
          // Salvar dirigente do sábado
          agendamentosParaSalvar.push({
            congregacao_id: window.currentCongregacaoId,
            tipo: "sabado",
            data_agendamento: dataFormatada,
            dirigente: config.dirigentes[indices.dir]
          });

          // Salvar idosos (agrupados como sabado/idosos, usaremos o tipo 'idosos')
          agendamentosParaSalvar.push({
            congregacao_id: window.currentCongregacaoId,
            tipo: "idosos",
            data_agendamento: dataFormatada,
            idoso: config.idosos[indices.ido],
            acompanhante: config.acompanhantes[indices.aco]
          });

          indices.dir = (indices.dir + 1) % config.dirigentes.length;
          indices.ido = (indices.ido + 1) % config.idosos.length;
          indices.aco = (indices.aco + 1) % config.acompanhantes.length;
        }

        if (dow === 0) {
          // Salvar domingo
          agendamentosParaSalvar.push({
            congregacao_id: window.currentCongregacaoId,
            tipo: "domingo",
            data_agendamento: dataFormatada,
            grupo: config.grupos[indices.grp]
          });

          indices.grp = (indices.grp + 1) % config.grupos.length;
        }
      }
    }

    if (agendamentosParaSalvar.length > 0) {
        // Apaga os agendamentos futuros para esse ano para substituí-cols
        const dtStr = `${ano}-${String(dataInicio.getMonth() + 1).padStart(2, '0')}-${String(dataInicio.getDate()).padStart(2, '0')}`;
        await window.supabaseClient.from("programacao")
           .delete()
           .eq("congregacao_id", window.currentCongregacaoId)
           .gte("data_agendamento", dtStr);

        // Insere os novos
        const { error } = await window.supabaseClient.from("programacao")
           .insert(agendamentosParaSalvar);

        if (error) throw error;
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