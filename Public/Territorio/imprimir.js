let dadosCarregados = null;
let usuarioAutenticado = false;

window.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado, verificando autenticação...');
    
    if (typeof window.supabaseClient === 'undefined') {
        console.error('Supabase não carregou!');
        document.getElementById('loading').innerHTML = `
            <div class="empty-state"><h3>❌ Erro</h3><p>Supabase não carregou corretamente</p></div>
        `;
        return;
    }

    window.supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
            usuarioAutenticado = true;
            console.log('✅ Usuário autenticado:', session.user.email);
            // Configurar mês atual
            const mesAtual = new Date().getMonth();
            const el = document.getElementById('mes-print');
            if (el) el.value = mesAtual;
        } else {
            usuarioAutenticado = false;
            console.log('❌ Usuário não autenticado');
            document.getElementById('loading').innerHTML = `
                <div class="empty-state">
                    <h3>🔒 Acesso Restrito</h3>
                    <p>Você precisa estar autenticado para acessar esta página</p>
                    <p style="margin-top: 15px;"><a href="../login.html" style="color: white; text-decoration: underline;">Fazer login</a></p>
                </div>
            `;
            const fg = document.querySelector('.form-group');
            if (fg) fg.style.display = 'none';
        }
    });
});

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

async function carregarParaImpressao() {
    if (!usuarioAutenticado) { alert('Você precisa estar autenticado'); return; }

    const anoStr = document.getElementById('ano-print').value;
    const mesInicial = parseInt(document.getElementById('mes-print').value);
    const modo = document.getElementById('modo-impressao').value;
    const loading = document.getElementById('loading');
    const btnImprimir = document.getElementById('btn-imprimir');

    if (!anoStr) { alert('Informe um ano válido'); return; }

    const mesesParaCarregar = modo === 'compacto' ? 2 : 1;
    const meses = [];
    for (let i = 0; i < mesesParaCarregar; i++) { meses.push((mesInicial + i) % 12); }

    loading.innerHTML = `<div class="loading"><div class="spinner"></div><p>Carregando dados...</p></div>`;
    btnImprimir.style.display = 'none';

    try {
        console.log('🔍 Buscando dados...');
        
        let query = window.supabaseClient.from('programacao')
          .select('*')
          .gte('data_agendamento', `${anoStr}-01-01`)
          .lte('data_agendamento', `${anoStr}-12-31`);
          
        if (window.currentCongregacaoId) {
            query = query.eq('congregacao_id', window.currentCongregacaoId);
        }

        const { data: snapshot, error } = await query;
        if (error) throw error;

        if (!snapshot || snapshot.length === 0) {
            loading.innerHTML = `<div class="empty-state"><h3>Nenhuma programação encontrada</h3><p>Não há dados para o ano ${anoStr}</p></div>`;
            return;
        }

        const dados = {};
        snapshot.forEach(doc => {
            const dataAgendamento = new Date(doc.data_agendamento + 'T00:00:00'); // Force local time avoid timezone shift
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

        const dadosFiltrados = Object.values(dados).filter(semana => meses.includes(semana.mesExibicao));

        if (dadosFiltrados.length === 0) {
            loading.innerHTML = `<div class="empty-state"><h3>Nenhuma programação encontrada</h3><p>Não há dados para o(s) mês(es) selecionado(s)</p></div>`;
            return;
        }

        dadosCarregados = dadosFiltrados;
        renderizarParaImpressao(dadosFiltrados, anoStr, mesInicial, meses);
        
        loading.innerHTML = '';
        btnImprimir.style.display = 'inline-block';
        mostrarPrevia();
    } catch (error) {
        console.error('❌ Erro:', error);
        loading.innerHTML = `<div class="empty-state"><h3>❌ Erro ao carregar</h3><p>${error.message}</p></div>`;
    }
}

function renderizarParaImpressao(semanas, ano, mesInicial, meses) {
    const nomesMeses = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const modoSelect = document.getElementById('modo-impressao');
    const modo = modoSelect ? modoSelect.value : 'detalhado';
    const printContent = document.getElementById('print-content');
    
    semanas.sort((a, b) => {
        const dataA = a.sabado?.data || a.domingo?.data || a.idosos?.data;
        const dataB = b.sabado?.data || b.domingo?.data || b.idosos?.data;
        return dataA - dataB;
    });

    if (modo === 'compacto') {
        renderizarCompacto(semanas, ano, mesInicial, nomesMeses, printContent, meses);
    } else {
        renderizarDetalhado(semanas, ano, mesInicial, nomesMeses, printContent);
    }
}

function renderizarCompacto(semanas, ano, mes, meses, printContent) {
    let html = `
        <div style="padding: 15px; font-family: Arial, sans-serif;">
            <div style="text-align: center; margin-bottom: 15px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
                <h1 style="margin: 0; font-size: 18px; color: #1f2937;">📅 Programação de Campo - ${meses[mes]}/${ano}</h1>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
                <thead>
                    <tr style="background: #667eea; color: white;">
                        <th style="border: 1px solid #999; padding: 3px; text-align: left; font-size: 9px;">Semana</th>
                        <th style="border: 1px solid #999; padding: 3px; text-align: left; font-size: 9px;">Sábado</th>
                        <th style="border: 1px solid #999; padding: 3px; text-align: left; font-size: 9px;">Domingo</th>
                    </tr>
                </thead>
                <tbody>
    `;

    semanas.forEach(semana => {
        if (semana.sabado || semana.domingo) {
            const periodoSemana = formatarPeriodoSemana(
                semana.sabado ? semana.sabado.data : null,
                semana.domingo ? semana.domingo.data : null
            );

            let sabadoHtml = '';
            let domingoHtml = '';

            if (semana.sabado) {
                sabadoHtml = `<strong>${formatarData(semana.sabado.data)}</strong><br>🎤 ${semana.sabado.dirigente}`;
                if (semana.idosos) sabadoHtml += `<br>👴 ${semana.idosos.idoso} / 🤝 ${semana.idosos.acompanhante}`;
            }

            if (semana.domingo) {
                domingoHtml = `<strong>${formatarData(semana.domingo.data)}</strong><br>👥 ${semana.domingo.grupo}`;
            }

            html += `
                <tr>
                    <td style="border: 1px solid #ccc; padding: 4px; background: #f9fafb; font-weight: 600; vertical-align: top; width: 28%; font-size: 8px;">
                        ${periodoSemana}
                    </td>
                    <td style="border: 1px solid #ccc; padding: 4px; vertical-align: top; width: 36%;">
                        ${sabadoHtml || '-'}
                    </td>
                    <td style="border: 1px solid #ccc; padding: 4px; vertical-align: top; width: 36%;">
                        ${domingoHtml || '-'}
                    </td>
                </tr>
            `;
        }
    });

    html += `</tbody></table></div>`;
    printContent.innerHTML = html;
}

function renderizarDetalhado(semanas, ano, mesInicial, nomesMeses, printContent) {
    let html = `
        <div style="padding: 15px; font-family: Arial, sans-serif; background: white;">
            <div style="text-align: center; margin-bottom: 15px; padding-bottom: 10px;">
                <div style="display: inline-block; background: #667eea; color: white; padding: 8px 20px; border-radius: 8px; margin-bottom: 8px;">
                    <span style="font-size: 24px; margin-right: 8px;">📅</span>
                    <span style="font-size: 18px; font-weight: bold;">Programação de Campo</span>
                </div>
                <h2 style="margin: 5px 0 0 0; font-size: 16px; color: #513737; font-weight: 600;">${nomesMeses[mesInicial]} de ${ano}</h2>
            </div>
    `;

    semanas.forEach((semana, index) => {
        if (semana.sabado || semana.domingo) {
            const periodoSemana = formatarPeriodoSemana(
                semana.sabado ? semana.sabado.data : null,
                semana.domingo ? semana.domingo.data : null
            );

            html += `<div style="margin-bottom: 12px; page-break-inside: avoid; border: 1px solid #064feb;border-radius: 6px; padding: 0px; background: #f9fafb;">`;
            html += `<div style="background: #e9e9eee1; padding: 6px 12px; border-left: 4px solid #2e51ee; border-radius: 6px 6px 0px 0px; margin-bottom: 8px; font-weight: 600; font-size: 11px; color: #371f1f;">${periodoSemana}</div>`;

            if (semana.sabado) {
                html += `
                    <div style="margin-bottom: 10px; padding-left: 12px;">
                        <div style="font-weight: bold; font-size: 11px; color: #8b5cf6; margin-bottom: 6px;">
                            SÁBADO - ${formatarData(semana.sabado.data)}
                        </div>
                        <div style="margin-left: 8px; font-size: 10px; line-height: 1.6;">
                            <div style="margin-bottom: 4px;">
                                <span style="display: inline-block; margin-right: 6px;">🎤</span>
                                <span style="font-weight: 600; color: #6b7280;">Dirigente de Campo:</span>
                                <span style="color: #1f2937;">${semana.sabado.dirigente}</span>
                            </div>
                `;

                if (semana.idosos) {
                    html += `
                            <div style="margin-bottom: 4px;">
                                <span style="display: inline-block; margin-right: 6px;">👴</span>
                                <span style="font-weight: 600; color: #6b7280;">Idoso:</span>
                                <span style="color: #1f2937;">${semana.idosos.idoso}</span>
                            </div>
                            <div style="margin-bottom: 4px;">
                                <span style="display: inline-block; margin-right: 6px;">🤝</span>
                                <span style="font-weight: 600; color: #6b7280;">Acompanhante:</span>
                                <span style="color: #1f2937;">${semana.idosos.acompanhante}</span>
                            </div>
                    `;
                }

                html += `</div></div>`;
            }

            if (semana.domingo) {
                html += `
                    <div style="margin-bottom: 10px; padding-left: 12px;">
                        <div style="font-weight: bold; font-size: 11px; color: #06b6d4; margin-bottom: 6px;">
                            DOMINGO - ${formatarData(semana.domingo.data)}
                        </div>
                        <div style="margin-left: 8px; font-size: 10px; line-height: 1.6;">
                            <div style="margin-bottom: 4px;">
                                <span style="display: inline-block; margin-right: 6px;">👥</span>
                                <span style="font-weight: 600; color: #6b7280;">Grupo:</span>
                                <span style="color: #1f2937;">${semana.domingo.grupo}</span>
                            </div>
                        </div>
                    </div>
                `;
            }
            html += `</div>`;
        }
    });

    html += `</div>`;
    printContent.innerHTML = html;
}

function aplicarModoImpressao() {
    const modo = document.getElementById('modo-impressao').value;
    const printContent = document.getElementById('print-content');
    if (modo === 'compacto') printContent.classList.add('compact-view');
    else printContent.classList.remove('compact-view');
}

function imprimir() { aplicarModoImpressao(); window.print(); }

function mostrarPrevia() {
    const previewContainer = document.getElementById('preview-container');
    const previewPaper = document.getElementById('preview-paper');
    const printContent = document.getElementById('print-content');
    
    const badge = previewPaper.querySelector('.preview-badge');
    previewPaper.innerHTML = printContent.innerHTML;
    if (badge) previewPaper.insertBefore(badge, previewPaper.firstChild);
    
    previewContainer.classList.add('show');
    document.querySelector('.controls-screen').style.display = 'none';
    setTimeout(() => { previewContainer.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
}

function voltarEdicao() {
    const previewContainer = document.getElementById('preview-container');
    const controlsScreen = document.querySelector('.controls-screen');
    previewContainer.classList.remove('show');
    controlsScreen.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}