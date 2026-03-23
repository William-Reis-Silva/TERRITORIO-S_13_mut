let programacaoCache = null;
let dadosCompletos = null;

function formatarData(data) {
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    return `${data.getDate()} de ${meses[data.getMonth()]}`;
}

function formatarPeriodoSemana(sabado, domingo) {
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    let dataRef = sabado || domingo;
    let diaSemana = dataRef.getDay();
    let diasParaSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
    let segundaFeira = new Date(dataRef);
    segundaFeira.setDate(dataRef.getDate() + diasParaSegunda);
    let domingoFim = new Date(segundaFeira);
    domingoFim.setDate(segundaFeira.getDate() + 6);
    
    if (segundaFeira.getMonth() === domingoFim.getMonth()) {
        return `Semana de ${segundaFeira.getDate()} a ${domingoFim.getDate()} de ${meses[segundaFeira.getMonth()]}`;
    } else {
        return `Semana de ${segundaFeira.getDate()} de ${meses[segundaFeira.getMonth()]} a ${domingoFim.getDate()} de ${meses[domingoFim.getMonth()]}`;
    }
}

function getChaveSemana(data) {
    let diaSemana = data.getDay();
    let diasParaSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
    let segundaFeira = new Date(data);
    segundaFeira.setDate(data.getDate() + diasParaSegunda);
    const ano = segundaFeira.getFullYear();
    const mes = String(segundaFeira.getMonth()).padStart(2, '0');
    const dia = String(segundaFeira.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function getMesExibicao(sabado, domingo, idosos) {
    if (sabado) return sabado.data.getMonth();
    if (domingo) return domingo.data.getMonth();
    if (idosos) return idosos.data.getMonth();
    return null;
}

function aplicarFiltro() {
    const mesFiltro = document.getElementById('mes-filtro').value;
    if (dadosCompletos) {
        const dadosFiltrados = {};
        Object.keys(dadosCompletos).forEach(chave => {
            const semana = dadosCompletos[chave];
            if (mesFiltro === '' || semana.mesExibicao === parseInt(mesFiltro)) {
                dadosFiltrados[chave] = semana;
            }
        });
        const ano = document.getElementById('ano-visualizar').value;
        renderizarProgramacao(dadosFiltrados, ano);
    }
}

async function carregarProgramacao() {
    const ano = document.getElementById('ano-visualizar').value;
    const content = document.getElementById('content');

    if (!ano) { alert('Informe um ano válido'); return; }

    content.innerHTML = `<div class="loading"><div class="spinner"></div><p>Carregando programação de ${ano}...</p></div>`;

    try {
        let query = window.supabaseClient.from('programacao')
          .select('*')
          .gte('data_agendamento', `${ano}-01-01`)
          .lte('data_agendamento', `${ano}-12-31`);
        
        if (window.currentCongregacaoId) {
            query = query.eq('congregacao_id', window.currentCongregacaoId);
        }

        const { data: snapshot, error } = await query;
        if (error) throw error;

        if (!snapshot || snapshot.length === 0) {
            content.innerHTML = `<div class="empty-state"><h3>Nenhuma programação encontrada</h3><p>Não há dados para o ano ${ano}</p></div>`;
            return;
        }

        const dados = {};
        snapshot.forEach(doc => {
            const dataAgendamento = new Date(doc.data_agendamento + 'T00:00:00');
            const chave = getChaveSemana(dataAgendamento);

            if (!dados[chave]) {
                dados[chave] = { sabado: null, domingo: null, idosos: null, mesExibicao: null };
            }

            if (doc.tipo === 'sabado') {
                dados[chave].sabado = { data: dataAgendamento, dirigente: doc.dirigente };
            } else if (doc.tipo === 'domingo') {
                dados[chave].domingo = { data: dataAgendamento, grupo: doc.grupo };
            } else if (doc.tipo === 'idosos') {
                dados[chave].idosos = { data: dataAgendamento, idoso: doc.idoso, acompanhante: doc.acompanhante };
            }
        });

        Object.keys(dados).forEach(chave => {
            const semana = dados[chave];
            semana.mesExibicao = getMesExibicao(semana.sabado, semana.domingo, semana.idosos);
        });

        dadosCompletos = dados;
        programacaoCache = dados;
        document.getElementById('mes-filtro').value = '';
        renderizarProgramacao(dados, ano);
    } catch (error) {
        console.error('Erro ao carregar:', error);
        content.innerHTML = `<div class="empty-state"><h3>❌ Erro ao carregar</h3><p>${error.message}</p></div>`;
    }
}

function renderizarProgramacao(dados, ano) {
    const content = document.getElementById('content');
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    const porMes = {};
    Object.values(dados).forEach(semana => {
        const mesExib = semana.mesExibicao;
        if (mesExib !== null) {
            if (!porMes[mesExib]) porMes[mesExib] = [];
            porMes[mesExib].push(semana);
        }
    });

    let html = '';
    
    Object.keys(porMes).sort((a, b) => a - b).forEach(mes => {
        html += `<div class="month-section"><h2 class="month-title">${meses[mes]} ${ano}</h2><div class="week-grid">`;

        porMes[mes].sort((a, b) => {
            const dataA = a.sabado?.data || a.domingo?.data || a.idosos?.data;
            const dataB = b.sabado?.data || b.domingo?.data || b.idosos?.data;
            return dataA - dataB;
        });

        porMes[mes].forEach(semana => {
            if (semana.sabado || semana.domingo) {
                const periodoSemana = formatarPeriodoSemana(semana.sabado?.data, semana.domingo?.data);
                
                html += `<div class="week-card"><div class="week-header"><div class="week-date">${periodoSemana}</div></div>`;

                if (semana.sabado) {
                    html += `<div class="week-info"><div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;"><div class="day-badge sabado-badge">Sábado - ${formatarData(semana.sabado.data)}</div></div>
                             <div class="info-row"><div class="info-icon">🎤</div><div class="info-content"><div class="info-label">Dirigente de Campo</div><div class="info-value">${semana.sabado.dirigente}</div></div></div>`;
                    if (semana.idosos) {
                        html += `<div class="info-row"><div class="info-icon">👴</div><div class="info-content"><div class="info-label">Idoso</div><div class="info-value">${semana.idosos.idoso}</div></div></div>
                                 <div class="info-row"><div class="info-icon">🤝</div><div class="info-content"><div class="info-label">Acompanhante</div><div class="info-value">${semana.idosos.acompanhante}</div></div></div>`;
                    }
                    html += `</div>`;
                }
                
                if (semana.domingo) {
                    html += `${semana.sabado ? '<div style="height: 1px; background: linear-gradient(90deg, transparent, rgba(0,0,0,0.1), transparent); margin: 0 20px;"></div>' : ''}
                             <div class="week-info"><div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;"><div class="day-badge domingo-badge">Domingo - ${formatarData(semana.domingo.data)}</div></div>
                             <div class="info-row"><div class="info-icon">👥</div><div class="info-content"><div class="info-label">Grupo</div><div class="info-value">${semana.domingo.grupo}</div></div></div></div>`;
                }
                html += `</div>`;
            }
        });
        html += `</div></div>`;
    });

    content.innerHTML = html;
}

window.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() { carregarProgramacao(); }, 500);
});