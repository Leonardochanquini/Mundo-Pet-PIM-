        let roleAtiva = 'admin';
        let filtroPeriodo = 'Mês Atual'; 

        const dtHoje = new Date();
        const dtOntem = new Date(dtHoje); dtOntem.setDate(dtHoje.getDate() - 1);
        const formatDt = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');

        let planoSelecionado = { nome: '', preco: 0 };
        let dadosClinica = {};
        let colaboradoresCheckout = [];
        let clinicaLogada = null; 
        let clinicaId = null; 
        
        let equipe = [];
        let estoque = [];
        let transacoes = [];
        let agendamentos = [];

        async function sincronizarDados() {
            if (!clinicaId) return;

            try {
                const [colabRes, transRes, estRes, agendaRes] = await Promise.all([
                    fetch(`http://localhost:8080/api/colaboradores/${clinicaId}`),
                    fetch(`http://localhost:8080/api/transacoes/${clinicaId}`),
                    fetch(`http://localhost:8080/api/estoque/${clinicaId}`),
                    fetch(`http://localhost:8080/api/agenda/${clinicaId}`).catch(() => null)
                ]);

                if (colabRes && colabRes.ok) equipe = await colabRes.json();
                if (transRes && transRes.ok) transacoes = await transRes.json();
                if (estRes && estRes.ok) estoque = await estRes.json();
                if (agendaRes && agendaRes.ok) agendamentos = await agendaRes.json();

            } catch (e) {
                console.error("Erro ao sincronizar dados:", e);
            }
        }

        function mascaraMoeda(i) {
            let v = i.value.replace(/\D/g,'');
            if(v === '') { i.value = ''; return; }
            v = (v/100).toFixed(2) + '';
            v = v.replace(".", ",");
            v = v.replace(/(\d)(\d{3})(\d{3}),/g, "$1.$2.$3,");
            v = v.replace(/(\d)(\d{3}),/g, "$1.$2,");
            i.value = 'R$ ' + v;
        }

        function mascaraCPF(i) {
            let v = i.value.replace(/\D/g, "");
            if (v.length > 11) v = v.substring(0, 11);
            v = v.replace(/(\d{3})(\d)/, "$1.$2");
            v = v.replace(/(\d{3})(\d)/, "$1.$2");
            v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
            i.value = v;
        }

        function mascaraCNPJ(i) {
            let v = i.value.replace(/\D/g, "");
            if (v.length > 14) v = v.substring(0, 14);
            v = v.replace(/(\d{2})(\d)/, "$1.$2");
            v = v.replace(/(\d{3})(\d)/, "$1.$2");
            v = v.replace(/(\d{3})(\d)/, "$1.$2");
            v = v.replace(/(\d{4})(\d{1,2})$/, "$1-$2");
            i.value = v;
        }

        function mascaraTelefone(i) {
            let v = i.value.replace(/\D/g, "");
            if (v.length > 11) v = v.substring(0, 11);
            v = v.replace(/(\d{2})(\d)/, "($1) $2");
            v = v.replace(/(\d{5})(\d)/, "$1-$2");
            i.value = v;
        }

        function mascaraCartao(i) {
            let v = i.value.replace(/\D/g, "");
            if (v.length > 16) v = v.substring(0, 16);
            v = v.replace(/(\d{4})(\d)/, "$1 $2");
            v = v.replace(/(\d{4})(\d)/, "$1 $2");
            v = v.replace(/(\d{4})(\d)/, "$1 $2");
            i.value = v;
        }

        function mascaraValidade(i) {
            let v = i.value.replace(/\D/g, "");
            if (v.length > 4) v = v.substring(0, 4);
            v = v.replace(/(\d{2})(\d)/, "$1/$2");
            i.value = v;
        }

        function mascaraCVV(i) {
            let v = i.value.replace(/\D/g, "");
            if (v.length > 4) v = v.substring(0, 4);
            i.value = v;
        }

        function irPara(id) {
            document.querySelectorAll('body > div').forEach(d => d.classList.add('hidden'));
            document.getElementById(id).classList.remove('hidden');
        }

        function selecionarPlano(n, p) {
            planoSelecionado = { nome: n, preco: p };
            document.getElementById('info-plano-etapa1').innerText = `Plano ${n} Selecionado - R$ ${p}/mês`;
            irPara('tela-checkout');
        }

        function mudarPerfil(r) {
            roleAtiva = r;
            document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            document.getElementById('tab-'+r).classList.add('active');
        }

        async function processarAssinatura() { irPara('tela-login'); }

        // Função utilitária para buscar cabeçalhos comuns em rotas seguras
        function getAuthHeaders() {
            return {
                'Content-Type': 'application/json',
                'X-Clinic-Id': clinicaId,
                'X-Usuario-Nome': clinicaLogada.nome
            };
        }

        async function efetuarLogin() {
            const email = document.getElementById('login-email').value;
            const senha = document.getElementById('login-senha').value;

            try {
                const res = await fetch('http://localhost:8080/api/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email, senha })
                });

                const data = await res.json();

                if (data.success) {
                    clinicaId = data.user.clinic_id;
                    clinicaLogada = { nome: data.user.nome, id: data.user.clinic_id, email: data.user.email, role: data.user.role };
                    
                    try {
                        const clinicaRes = await fetch(`http://localhost:8080/api/clinica/${clinicaId}`);
                        if(clinicaRes.ok) {
                            const clinicaDados = await clinicaRes.json();
                            clinicaLogada.nomeClinica = clinicaDados.nome;
                            clinicaLogada.logo = clinicaDados.logotipo;
                            clinicaLogada.cnpj = clinicaDados.cnpj || '';
                            clinicaLogada.telefone = clinicaDados.telefone || '';
                            clinicaLogada.endereco = clinicaDados.endereco || '';
                            clinicaLogada.email_contato = clinicaDados.email_contato || '';
                            clinicaLogada.categorias_prontuario = clinicaDados.categorias_prontuario || '';
                            clinicaLogada.tipos_animais = clinicaDados.tipos_animais || '';
                            clinicaLogada.cargos = clinicaDados.cargos || '';
                        }

                        const colabRes = await fetch(`http://localhost:8080/api/colaboradores/${clinicaId}`);
                        if(colabRes.ok) equipe = await colabRes.json();

                        const transRes = await fetch(`http://localhost:8080/api/transacoes/${clinicaId}`);
                        if(transRes.ok) transacoes = await transRes.json();

                        const estRes = await fetch(`http://localhost:8080/api/estoque/${clinicaId}`);
                        if(estRes.ok) estoque = await estRes.json();

                    } catch (error) {
                        console.error('Erro ao buscar dados iniciais:', error);
                    }
                    
                    irPara('app-container');
                    document.getElementById('clinica-tag').innerText = clinicaLogada.nomeClinica || `Clínica ${clinicaId}`;
                    
                    if (clinicaLogada.role === 'Administrador') {
                        document.getElementById('menu-configuracoes').classList.remove('hidden');
                    } else {
                        document.getElementById('menu-configuracoes').classList.add('hidden');
                    }

                    atualizarLogoSidebar();
                    montarMenu();
                   if (clinicaLogada.role === 'Administrador') {
                    montarMenuAdmin();
                    navegarModulo('financeiro');
                } else if (clinicaLogada.role === 'Recepção') {
                    montarMenuRecepcao();
                    navegarModulo('recepcao-dashboard');
                } else if (clinicaLogada.role === 'Veterinário') {
                    montarMenuVet();
                    navegarModulo('vet-agenda');
}
                } else {
                    mostrarPopup('❌ Erro de Login', data.error || "Usuário ou senha incorretos");
                }
            } catch (e) {
                mostrarPopup('🔌 Erro de Conexão', "Erro: O servidor não está rodando na porta 8080.");
            }
        }

        setInterval(sincronizarDados, 3000);

        function montarMenu() {
            document.getElementById('menu-lateral').innerHTML = `
                <div onclick="navegarModulo('financeiro')" class="sidebar-item" id="m-financeiro">💰 Financeiro</div>
                <div onclick="navegarModulo('equipe')" class="sidebar-item" id="m-equipe">👥 Equipe</div>
                <div onclick="navegarModulo('estoque')" class="sidebar-item" id="m-estoque">📦 Estoque</div>
                <div onclick="navegarModulo('auditoria')" class="sidebar-item" id="m-auditoria">📜 Auditoria</div>
            `;
        }
        function montarMenuAdmin() {
            document.getElementById('menu-lateral').innerHTML = `
                <div onclick="navegarModulo('financeiro')" class="sidebar-item">💰 Financeiro</div>
                <div onclick="navegarModulo('equipe')" class="sidebar-item">👥 Equipe</div>
                <div onclick="navegarModulo('estoque')" class="sidebar-item">📦 Estoque</div>
                <div onclick="navegarModulo('auditoria')" class="sidebar-item">📜 Auditoria</div>
            `;
        }

        function montarMenuRecepcao() {
            document.getElementById('menu-lateral').innerHTML = `
                <div onclick="navegarModulo('recepcao-dashboard')" class="sidebar-item">📊 Dashboard</div>
                <div onclick="navegarModulo('agenda')" class="sidebar-item">📅 Agenda</div>
                <div onclick="navegarModulo('clientes')" class="sidebar-item">👤 Clientes</div>
                <div onclick="navegarModulo('pets')" class="sidebar-item">🐶 Pets</div>
                <div onclick="navegarModulo('fila')" class="sidebar-item">⏳ Fila</div>
                <div onclick="navegarModulo('caixa')" class="sidebar-item">💰 Caixa</div>
                <div onclick="navegarModulo('relatorios')" class="sidebar-item">📄 Relatórios</div>
            `;
        }

        function montarMenuVet() {
            document.getElementById('menu-lateral').innerHTML = `
                <div onclick="navegarModulo('vet-agenda')" class="sidebar-item">📅 Agenda</div>
                <div onclick="navegarModulo('prontuario')" class="sidebar-item">📋 Prontuário</div>
            `;
        }

        async function navegarModulo(mod) {
            await sincronizarDados();
            const cont = document.getElementById('conteudo-dinamico');
            const tit = document.getElementById('modulo-titulo');
            const actions = document.getElementById('header-actions');
            
            document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
            if(document.getElementById('m-'+mod)) document.getElementById('m-'+mod).classList.add('active');
            actions.innerHTML = "";

            if(mod === 'financeiro') {
                tit.innerText = "Visão de Negócio";
                actions.innerHTML = `
                    <select id="filtro-data" class="p-2 border rounded-lg text-sm font-bold bg-white cursor-pointer hover:bg-gray-50" onchange="mudarFiltroPeriodo(this.value)">
                        <option value="Hoje" ${filtroPeriodo === 'Hoje' ? 'selected' : ''}>Hoje</option>
                        <option value="Últimos 7 dias" ${filtroPeriodo === 'Últimos 7 dias' ? 'selected' : ''}>Últimos 7 dias</option>
                        <option value="Mês Atual" ${filtroPeriodo === 'Mês Atual' ? 'selected' : ''}>Mês Atual</option>
                    </select>
                    <button onclick="abrirModalTransacao()" class="btn-principal px-4 py-2 rounded-lg font-bold text-sm">+ Nova Transação</button>
                    <button onclick="window.print()" class="bg-white border px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-50">📥 Exportar PDF</button>
                `;
                atualizarDOMFinanceiro(cont);
            
            } else if(mod === 'equipe') {
                tit.innerText = "Recursos Humanos";
                actions.innerHTML = `<button onclick="abrirModalColaborador()" class="btn-principal px-6 py-2 rounded-xl font-bold">+ Novo Colaborador</button>`;
                cont.innerHTML = `
                    <div class="mb-6"><input id="busca-equipe" onkeyup="filtrarEquipe()" placeholder="Buscar por nome ou CPF..." class="input-pet !w-full max-w-md"></div>
                    <div class="card">
                        <table>
                            <thead><tr><th>Nome</th><th>Cargo</th><th>E-mail</th><th>Status</th><th>Último Acesso</th><th>Ações</th></tr></thead>
                            <tbody id="tabela-equipe-corpo">${renderEquipe(equipe)}</tbody>
                        </table>
                    </div>
                `;
            
            } else if(mod === 'estoque') {
                tit.innerText = "Estoque Estratégico";
                actions.innerHTML = `<button onclick="abrirModalEstoque()" class="btn-principal px-6 py-2 rounded-xl font-bold">+ Novo Item</button>`;
                cont.innerHTML = `
                    <div class="bg-red-50 border border-red-200 p-4 rounded-xl mb-6 flex gap-4 items-center">
                        <span class="text-2xl">⚠️</span>
                        <div><p class="font-bold text-red-800 text-sm">Alerta de Suprimentos Baixos</p><p class="text-xs text-red-600">Itens com quantidade abaixo de 5 precisam ser repostos.</p></div>
                    </div>
                    <div class="card">
                        <table>
                            <thead><tr><th>Produto</th><th>Lote</th><th>Validade</th><th>Qtd</th><th class="text-right">Ações Rápidas</th></tr></thead>
                            <tbody id="tabela-estoque-corpo">${renderEstoque()}</tbody>
                        </table>
                    </div>
                `;
            
            } else if(mod === 'auditoria') {
                tit.innerText = "Logs de Auditoria";
                actions.innerHTML = `<button onclick="carregarAuditoria()" class="btn-principal px-4 py-2 rounded-lg font-bold text-sm">Atualizar Logs</button>`;
                cont.innerHTML = `Carregando logs de segurança...`;
                carregarAuditoria(); // Fetch automático 
            
            } else if(mod === 'configuracoes') {
                tit.innerText = "Configurações do Sistema";
                cont.innerHTML = `
                    <div class="max-w-2xl">
                        <div class="card mb-6">
                            <h3 class="text-xl font-bold mb-4 border-b pb-2">Informações da Clínica</h3>
                            <div class="space-y-4">
                                <div>
                                    <label class="text-xs font-bold text-gray-500 mb-1 block">Nome da Clínica</label>
                                    <input id="config-nome-clinica" value="${clinicaLogada.nomeClinica || ''}" class="input-pet">
                                </div>
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="text-xs font-bold text-gray-500 mb-1 block">CNPJ</label>
                                        <input id="config-cnpj-clinica" value="${clinicaLogada.cnpj || ''}" onkeyup="mascaraCNPJ(this)" class="input-pet">
                                    </div>
                                    <div>
                                        <label class="text-xs font-bold text-gray-500 mb-1 block">Telefone</label>
                                        <input id="config-telefone-clinica" value="${clinicaLogada.telefone || ''}" onkeyup="mascaraTelefone(this)" class="input-pet">
                                    </div>
                                </div>
                                <div>
                                    <label class="text-xs font-bold text-gray-500 mb-1 block">Endereço (Aparecerá em Relatórios/Receitas)</label>
                                    <input id="config-endereco-clinica" value="${clinicaLogada.endereco || ''}" class="input-pet">
                                </div>
                                <div>
                                    <label class="text-xs font-bold text-gray-500 mb-1 block">E-mail de Contato</label>
                                    <input id="config-email-contato" value="${clinicaLogada.email_contato || ''}" class="input-pet">
                                </div>
                                <div>
                                    <div class="flex items-center gap-3">
                                        <img id="preview-logo" src="${clinicaLogada.logo || ''}" class="w-12 h-12 rounded-full object-cover border" style="${clinicaLogada.logo ? '' : 'display:none;'}">
                                        <input type="file" id="config-logo-clinica" accept="image/*" class="input-pet" onchange="previewLogoFile(this)">
                                    </div>
                                    <input type="hidden" id="config-logo-base64" value="${clinicaLogada.logo || ''}">
                                    <p class="text-xs text-gray-400 mt-1">Selecione uma imagem do seu computador (será salva no banco).</p>
                                </div>

                                <h4 class="text-lg font-bold mt-6 mb-2 border-b pb-1">Personalização do Sistema</h4>

                                <div>
                                    <label class="text-xs font-bold text-gray-500 mb-1 block">Categorias de Prontuários</label>
                                    <div class="flex gap-2 mb-2">
                                        <select id="config-categorias-prontuario-select" class="input-pet flex-grow"></select>
                                        <button onclick="removerOpcao('config-categorias-prontuario-select', 'config-categorias-prontuario-hidden')" class="bg-red-100 text-red-600 px-3 rounded-lg font-bold hover:bg-red-200">Remover</button>
                                    </div>
                                    <div class="flex gap-2">
                                        <input id="nova-categoria-prontuario" placeholder="Nova categoria..." class="input-pet flex-grow">
                                        <button onclick="adicionarOpcao('nova-categoria-prontuario', 'config-categorias-prontuario-select', 'config-categorias-prontuario-hidden')" class="bg-green-100 text-green-600 px-3 rounded-lg font-bold hover:bg-green-200">Adicionar</button>
                                    </div>
                                    <input type="hidden" id="config-categorias-prontuario-hidden" value="${clinicaLogada.categorias_prontuario || ''}">
                                </div>

                                <div class="mt-4">
                                    <label class="text-xs font-bold text-gray-500 mb-1 block">Tipos de Animais Atendidos</label>
                                    <div class="flex gap-2 mb-2">
                                        <select id="config-tipos-animais-select" class="input-pet flex-grow"></select>
                                        <button onclick="removerOpcao('config-tipos-animais-select', 'config-tipos-animais-hidden')" class="bg-red-100 text-red-600 px-3 rounded-lg font-bold hover:bg-red-200">Remover</button>
                                    </div>
                                    <div class="flex gap-2">
                                        <input id="novo-tipo-animal" placeholder="Novo tipo..." class="input-pet flex-grow">
                                        <button onclick="adicionarOpcao('novo-tipo-animal', 'config-tipos-animais-select', 'config-tipos-animais-hidden')" class="bg-green-100 text-green-600 px-3 rounded-lg font-bold hover:bg-green-200">Adicionar</button>
                                    </div>
                                    <input type="hidden" id="config-tipos-animais-hidden" value="${clinicaLogada.tipos_animais || ''}">
                                </div>

                                <div class="mt-4">
                                    <label class="text-xs font-bold text-gray-500 mb-1 block">Cargos da Equipe</label>
                                    <div class="flex gap-2 mb-2">
                                        <select id="config-cargos-select" class="input-pet flex-grow"></select>
                                        <button onclick="removerOpcao('config-cargos-select', 'config-cargos-hidden')" class="bg-red-100 text-red-600 px-3 rounded-lg font-bold hover:bg-red-200">Remover</button>
                                    </div>
                                    <div class="flex gap-2">
                                        <input id="novo-cargo" placeholder="Novo cargo..." class="input-pet flex-grow">
                                        <button onclick="adicionarOpcao('novo-cargo', 'config-cargos-select', 'config-cargos-hidden')" class="bg-green-100 text-green-600 px-3 rounded-lg font-bold hover:bg-green-200">Adicionar</button>
                                    </div>
                                    <input type="hidden" id="config-cargos-hidden" value="${clinicaLogada.cargos || ''}">
                                </div>
                                
                                <button onclick="salvarConfiguracoesClinica()" class="btn-principal px-6 py-2 rounded-xl font-bold mt-4">Salvar Configurações</button>
                            </div>
                        </div>
                        <div class="card">
                            <h3 class="text-xl font-bold mb-4 border-b pb-2">Segurança da Conta</h3>
                            <div class="space-y-4">
                                <div>
                                    <label class="text-xs font-bold text-gray-500 mb-1 block">E-mail de Acesso Atual</label>
                                    <input value="${clinicaLogada.email || ''}" class="input-pet bg-gray-100" disabled>
                                </div>
                                <div>
                                    <label class="text-xs font-bold text-gray-500 mb-1 block">Nova Senha</label>
                                    <input id="config-nova-senha" type="password" placeholder="Mínimo 6 caracteres" class="input-pet">
                                </div>
                                <button onclick="salvarNovaSenha()" class="btn-principal px-6 py-2 rounded-xl font-bold mt-2">Alterar Senha</button>
                            </div>
                        </div>
                    </div>
                `;
                setTimeout(() => {
                    inicializarSelect('config-categorias-prontuario-select', 
                        clinicaLogada.categorias_prontuario || "Consulta, Cirurgia, Exame"
                    );
                    inicializarSelect('config-tipos-animais-select', 
                        clinicaLogada.tipos_animais || "Cachorro, Gato"
                    );
                    inicializarSelect('config-cargos-select', 
                        clinicaLogada.cargos || "Administrador, Veterinário, Recepção"
                    );
                }, 100);
            }
            // ================= RECEPÇÃO =================

            else if(mod === 'recepcao-dashboard') {
            tit.innerText = "Dashboard - Recepção";

            const hoje = new Date().toLocaleDateString('pt-BR');

            // ===== DADOS =====
            const transHoje = transacoes.filter(t => t.data === hoje);

            const faturamento = transHoje
                .filter(t => t.tipo === 'entrada')
                .reduce((a,b)=>a+b.valor, 0);

            // Simulação simples (até você integrar backend real dessas partes)
            const totalAgendamentos = transHoje.length; 
            const emAtendimento = Math.floor(totalAgendamentos * 0.4);
            const aguardando = totalAgendamentos - emAtendimento;
            const lembretes = Math.floor(totalAgendamentos * 0.2);

            // ===== GRÁFICO SIMPLES =====
            const valoresPorHora = {};
            transHoje.forEach(t => {
                const hora = new Date().getHours(); // simplificado
                valoresPorHora[hora] = (valoresPorHora[hora] || 0) + t.valor;
            });

            const labels = Object.keys(valoresPorHora);
            const dados = Object.values(valoresPorHora);

            cont.innerHTML = `
                <div class="grid grid-cols-4 gap-4 mb-6">
                    <div class="card">
                        <b>Agendamentos Hoje</b><br>${totalAgendamentos}
                    </div>
                    <div class="card">
                        <b>Em Atendimento</b><br>${emAtendimento}
                    </div>
                    <div class="card">
                        <b>Aguardando</b><br>${aguardando}
                    </div>
                    <div class="card">
                        <b>Lembretes</b><br>${lembretes}
                    </div>
                </div>

                <div class="card mb-6">
                    <h3 class="font-bold mb-2">Faturamento Diário</h3>
                    <p class="text-2xl font-black text-green-600">
                        R$ ${faturamento.toLocaleString('pt-BR',{minimumFractionDigits:2})}
                    </p>
                </div>

                <div class="card">
                    <h3 class="font-bold mb-4">Faturamento por Hora</h3>
                    <canvas id="graficoRecepcao" height="100"></canvas>
                </div>
            `;

            setTimeout(() => {
                const ctx = document.getElementById('graficoRecepcao');

                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels.length ? labels : ['Sem dados'],
                        datasets: [{
                            label: 'R$',
                            data: dados.length ? dados : [0]
                        }]
                    }
                });
            }, 100);
        }

             else if(mod === 'agenda') {
                tit.innerText = "Agenda";
                
                // Inicializa variáveis do calendário globalmente para não resetar
                if (typeof window.mesAtual === 'undefined') {
                    window.dataAtualCal = new Date();
                    window.mesAtual = window.dataAtualCal.getMonth();
                    window.anoAtual = window.dataAtualCal.getFullYear();
                }

                // Função que desenha o calendário
                window.renderizarCalendario = function() {
                    const contCalendario = document.getElementById('calendario-container');
                    if (!contCalendario) return;

                    const hoje = new Date();
                    const primeiroDiaMes = new Date(window.anoAtual, window.mesAtual, 1).getDay();
                    const diasNoMes = new Date(window.anoAtual, window.mesAtual + 1, 0).getDate();
                    
                    const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
                    document.getElementById('mes-ano-display').innerText = `${nomesMeses[window.mesAtual]} ${window.anoAtual}`;

                    let htmlDias = '';
                    
                    // Dias vazios antes do início do mês
                    for (let i = 0; i < primeiroDiaMes; i++) {
                        htmlDias += `<div class="p-2"></div>`;
                    }

                   // Dias preenchidos do mês
                    for (let i = 1; i <= diasNoMes; i++) {
                        const isHoje = (i === hoje.getDate() && window.mesAtual === hoje.getMonth() && window.anoAtual === hoje.getFullYear());
                        
                        // Verifica se tem agendamento neste dia
                        const dataFormatada = `${window.anoAtual}-${String(window.mesAtual + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                        const qtdAgendamentos = agendamentos.filter(a => a.data === dataFormatada).length;
                        const badge = qtdAgendamentos > 0 ? `<div class="mt-1 bg-blue-100 text-blue-800 text-[10px] rounded-full px-2 py-0.5 inline-block font-bold">${qtdAgendamentos} agend.</div>` : '';

                        htmlDias += `
                            <div class="${isHoje ? 'bg-blue-500 text-white font-bold shadow' : 'bg-gray-50 hover:bg-gray-200 text-gray-700 cursor-pointer'} p-2 rounded transition-colors flex flex-col items-center justify-center min-h-[60px]" onclick="window.abrirModalAgendamentosDoDia(${i}, ${window.mesAtual}, ${window.anoAtual})">
                                <span>${i}</span>
                                ${badge}
                            </div>
                        `;
                    }
                    contCalendario.innerHTML = htmlDias;
                };

                // Função para avançar ou recuar os meses
                window.mudarMes = function(step) {
                    window.mesAtual += step;
                    if (window.mesAtual < 0) {
                        window.mesAtual = 11;
                        window.anoAtual--;
                    } else if (window.mesAtual > 11) {
                        window.mesAtual = 0;
                        window.anoAtual++;
                    }
                    window.renderizarCalendario();
                };

                // Função para exibir tudo marcado no dia clicado
                window.abrirModalAgendamentosDoDia = function(dia, mes, ano) {
                    const dataFormatada = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                    const agendamentosDoDia = agendamentos.filter(a => a.data === dataFormatada);
                    
                    let htmlLista = '';
                    if(agendamentosDoDia.length === 0) {
                        htmlLista = '<p class="text-gray-500 text-center py-4">Nenhum atendimento marcado para este dia.</p>';
                    } else {
                        // Ordena pela hora
                        agendamentosDoDia.sort((a, b) => a.hora.localeCompare(b.hora));
                        htmlLista = agendamentosDoDia.map(a => `
                            <div class="p-4 border border-gray-200 rounded-xl mb-3 bg-white shadow-sm">
                                <div class="flex justify-between items-center mb-2">
                                    <span class="font-black text-blue-600 text-lg">🕒 ${a.hora}</span>
                                    <span class="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-md text-xs font-bold uppercase">${a.tipo} - ${a.especialidade || 'Clínica Geral'}</span>
                                </div>
                                <p class="text-sm text-gray-800"><b class="text-gray-500">Cliente:</b> ${a.cliente}</p>
                                <p class="text-sm text-gray-800"><b class="text-gray-500">Pet:</b> ${a.pet}</p>
                                ${a.obs ? `<p class="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded border"><b>Obs:</b> ${a.obs}</p>` : ''}
                            </div>
                        `).join('');
                    }

                    document.getElementById('modal-titulo').innerText = `Agenda: ${String(dia).padStart(2, '0')}/${String(mes + 1).padStart(2, '0')}/${ano}`;
                    document.getElementById('modal-body').innerHTML = `<div class="max-h-96 overflow-y-auto bg-gray-50 p-3 rounded-lg">${htmlLista}</div>`;
                    
                    const btn = document.getElementById('modal-confirmar');
                    btn.innerText = "Fechar";
                    btn.style.background = '#9ca3af'; // Volta para cinza
                    btn.onclick = fecharModal;
                    
                    document.getElementById('modal-container').style.display = 'flex';
                };

                // HTML do calendário interativo mantendo o padrão visual
                cont.innerHTML = `
                    <div class="flex justify-between items-center mb-4">
                        <div class="flex items-center gap-4">
                            <button onclick="window.mudarMes(-1)" class="px-3 py-1 bg-white border border-gray-300 hover:bg-gray-100 rounded font-bold text-gray-600">&lt;</button>
                            <h3 id="mes-ano-display" class="font-bold text-lg min-w-[150px] text-center text-gray-800"></h3>
                            <button onclick="window.mudarMes(1)" class="px-3 py-1 bg-white border border-gray-300 hover:bg-gray-100 rounded font-bold text-gray-600">&gt;</button>
                        </div>
                        <button onclick="abrirModalAgendamento()" class="btn-principal px-4 py-2 rounded-lg font-bold shadow-sm">+ Novo Agendamento</button>
                    </div>
                    <div class="card">
                        <div class="grid grid-cols-7 gap-2 text-center font-bold text-gray-400 text-xs uppercase mb-2">
                            <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
                        </div>
                        <div id="calendario-container" class="grid grid-cols-7 gap-2 text-center">
                            </div>
                    </div>
                `;

                // Renderiza assim que injetar o HTML
                setTimeout(window.renderizarCalendario, 0);
            }

            else if(mod === 'clientes') {
                tit.innerText = "Clientes";

                cont.innerHTML = `
                    <div class="flex justify-between mb-4">
                        <input placeholder="Buscar Nome, CPF ou Telefone" class="input-pet w-1/2">
                        <button class="btn-principal px-4 py-2 rounded-lg">+ Novo Cliente</button>
                    </div>

                    <div class="card">
                        <table>
                            <thead><tr><th>Nome</th><th>Telefone</th><th>Histórico</th></tr></thead>
                            <tbody>
                                <tr><td>João Silva</td><td>(11)99999-9999</td><td>3 consultas</td></tr>
                            </tbody>
                        </table>
                    </div>
                `;
            }

            else if(mod === 'pets') {
                tit.innerText = "Pets";

                cont.innerHTML = `
                    <input placeholder="Buscar por nome ou raça" class="input-pet mb-4">

                    <div class="card">
                        <table>
                            <thead><tr><th>Nome</th><th>Raça</th><th>Dono</th><th>Alerta</th></tr></thead>
                            <tbody>
                                <tr>
                                    <td>Rex</td>
                                    <td>Pastor Alemão</td>
                                    <td>João Silva</td>
                                    <td class="text-red-500 font-bold">Agressivo</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                `;
            }

            else if(mod === 'fila') {
                tit.innerText = "Fila de Atendimento";

                cont.innerHTML = `
                    <div class="card">
                        <table>
                            <thead><tr><th>Pet</th><th>Hora</th><th>Status</th></tr></thead>
                            <tbody>
                                <tr>
                                    <td>Rex</td>
                                    <td>14:00</td>
                                    <td>Aguardando</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                `;
            }

           else if(mod === 'caixa') {
            tit.innerText = "Caixa";

            const hoje = new Date().toLocaleDateString('pt-BR');

            const hojeTransacoes = transacoes.filter(t => t.data === hoje);
            const faturamento = hojeTransacoes
                .filter(t => t.tipo === 'entrada')
                .reduce((a,b)=>a+b.valor, 0);

            cont.innerHTML = `
                <div class="card mb-4">
                    <button onclick="abrirModalTransacao()" class="btn-principal px-4 py-2 rounded-lg">
                        + Novo Lançamento
                    </button>
                </div>

                <div class="card">
                    <p><b>Faturamento do dia:</b> 
                        R$ ${faturamento.toLocaleString('pt-BR',{minimumFractionDigits:2})}
                    </p>
                    <button class="bg-red-500 text-white px-4 py-2 rounded mt-4">
                        Fechar Caixa
                    </button>
                </div>
            `;
        }

            else if(mod === 'relatorios') {
                tit.innerText = "Relatórios";

                cont.innerHTML = `
                    <div class="card">
                        <p><b>Atendimentos:</b> 30</p>
                        <p><b>Ticket Médio:</b> R$ 120</p>
                        <p><b>Inadimplência:</b> 2 clientes</p>
                    </div>
                `;
            }
        }

        async function carregarAuditoria() {
            try {
                const res = await fetch(`http://localhost:8080/api/auditoria/${clinicaId}`);
                if (res.ok) {
                    const logs = await res.json();
                    let html = logs.map(a => `
                        <tr>
                            <td class="text-xs text-gray-500">${a.data_hora}</td>
                            <td class="font-bold text-blue-800">${a.usuario}</td>
                            <td class="text-gray-700">${a.acao}</td>
                        </tr>
                    `).join('');
                    
                    if (!html) html = `<tr><td colspan="3" class="text-center py-6 text-gray-400 italic">Nenhum registro de auditoria efetuado ainda.</td></tr>`;
                    
                    document.getElementById('conteudo-dinamico').innerHTML = `
                        <div class="card">
                            <table>
                                <thead><tr><th>Data/Hora</th><th>Usuário Responsável</th><th>Ação Realizada</th></tr></thead>
                                <tbody>${html}</tbody>
                            </table>
                        </div>
                    `;
                }
            } catch (e) {
                document.getElementById('conteudo-dinamico').innerHTML = `<p class="text-red-500 font-bold">Erro ao carregar logs.</p>`;
            }
        }

        function renderEquipe(lista) {
            if (lista.length === 0) return `<tr><td colspan="6" class="text-center py-4 text-gray-400 italic">Nenhum colaborador encontrado.</td></tr>`;
            return lista.map(u => `
                <tr>
                    <td class="font-bold">${u.nome}<br><span class="text-xs text-gray-400 font-normal">${u.cpf || 'Não informado'}</span></td>
                    <td class="uppercase text-xs font-bold">${u.cargo}</td>
                    <td>${u.email || '-'}</td>
                    <td>
                        <span onclick="alternarStatus(${u.id})" class="status-badge ${u.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}" title="Clique para mudar">
                            ${u.status || 'Ativo'} 
                        </span>
                    </td>
                    <td class="text-gray-400 text-xs">${u.ultimoAcesso || '-'}</td>
                    <td><button onclick="abrirModalColaborador(${u.id})" class="text-blue-500 font-bold underline hover:text-blue-700">Editar</button></td>
                </tr>
            `).join('');
        }

        function filtrarEquipe() {
            const q = document.getElementById('busca-equipe').value.toLowerCase();
            const filtrados = equipe.filter(u => 
                u.nome.toLowerCase().includes(q) || 
                (u.cpf && u.cpf.replace(/\D/g,'').includes(q.replace(/\D/g,'')))
            );
            document.getElementById('tabela-equipe-corpo').innerHTML = renderEquipe(filtrados);
        }

        async function alternarStatus(id) {
            const idx = equipe.findIndex(e => e.id === id);
            const novoStatus = equipe[idx].status === 'Ativo' ? 'Inativo' : 'Ativo';
            
            try {
                const res = await fetch(`http://localhost:8080/api/colaborador/${id}/status`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ status: novoStatus })
                });
                
                if(res.ok) {
                    equipe[idx].status = novoStatus;
                    filtrarEquipe();
                }
            } catch (error) {
                mostrarPopup('Erro', 'Não foi possível alterar o status no banco de dados.');
            }
        }

        function abrirModalColaborador(editId = null) {
            const u = editId ? equipe.find(x => x.id === editId) : null;
            document.getElementById('modal-titulo').innerText = editId ? "Editar Colaborador" : "Novo Colaborador";
            
            document.getElementById('modal-body').innerHTML = `
                <div class="space-y-4">
                    <div>
                        <label class="text-xs font-bold text-gray-500 mb-1 block">Nome Completo</label>
                        <input id="new-colab-nome" value="${u?.nome || ''}" placeholder="Ex: João da Silva" class="input-pet">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="text-xs font-bold text-gray-500 mb-1 block">CPF</label>
                            <input id="new-colab-cpf" value="${u?.cpf || ''}" onkeyup="mascaraCPF(this)" placeholder="000.000.000-00" class="input-pet">
                        </div>
                        <div>
                            <label class="text-xs font-bold text-gray-500 mb-1 block">Cargo</label>
                            <select id="new-colab-cargo" class="input-pet">
                                <option value="Administrador" ${u?.cargo === 'Administrador' ? 'selected' : ''}>Administrador</option>
                                <option value="Veterinário" ${u?.cargo === 'Veterinário' ? 'selected' : ''}>Veterinário</option>
                                <option value="Recepção" ${u?.cargo === 'Recepção' ? 'selected' : ''}>Recepção</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="text-xs font-bold text-gray-500 mb-1 block">E-mail Institucional</label>
                        <input id="new-colab-email" value="${u?.email || ''}" type="email" placeholder="nome@mundopet.com" class="input-pet">
                    </div>
                    ${!u ? `
                    <div>
                        <label class="text-xs font-bold text-gray-500 mb-1 block">Senha Provisória</label>
                        <input id="new-colab-senha" type="password" placeholder="••••••••" class="input-pet">
                    </div>` : ''}
                </div>
            `;

            document.getElementById('modal-confirmar').onclick = async () => {
                const dados = {
                    nome: document.getElementById('new-colab-nome').value,
                    cpf: document.getElementById('new-colab-cpf').value,
                    cargo: document.getElementById('new-colab-cargo').value,
                    email: document.getElementById('new-colab-email').value
                };

                if (!dados.nome || !dados.cpf || !dados.email) return mostrarPopup('⚠️', 'Preencha nome, CPF e email.');

                try {
                    if(editId) {
                        const res = await fetch(`http://localhost:8080/api/colaborador/${editId}`, {
                            method: 'PUT',
                            headers: getAuthHeaders(),
                            body: JSON.stringify(dados)
                        });
                        if (res.ok) {
                            Object.assign(u, dados);
                            mostrarPopup('✅ Sucesso', 'Colaborador atualizado!');
                        }
                    } else {
                        const senha = document.getElementById('new-colab-senha').value;
                        if (!senha) return mostrarPopup('⚠️', 'Defina uma senha.');
                        
                        const res = await fetch('http://localhost:8080/api/colaborador', {
                            method: 'POST',
                            headers: getAuthHeaders(),
                            body: JSON.stringify({ ...dados, senha, clinica_id: clinicaId })
                        });

                        const result = await res.json();
                        if (res.ok) {
                            equipe.push({ id: result.id, ...dados, status: 'Ativo', ultimoAcesso: 'Nunca' });
                            mostrarPopup('✅ Sucesso', `Cadastrado com sucesso!`);
                        } else {
                            return mostrarPopup('❌ Erro', result.error);
                        }
                    }
                    
                    fecharModal();
                    navegarModulo('equipe');
                } catch (error) {
                    mostrarPopup('🔌 Erro', 'Erro de conexão.');
                }
            };
            document.getElementById('modal-container').style.display = 'flex';
        }

        function mudarFiltroPeriodo(valor) {
            filtroPeriodo = valor;
            atualizarDOMFinanceiro(document.getElementById('conteudo-dinamico'));
        }

        function getTransacoesFiltradas() {
            const hoje = new Date();
            const anoAtual = hoje.getFullYear();

            return transacoes.filter(t => {
                const [dia, mes] = t.data.split('/');
                const dataT = new Date(anoAtual, parseInt(mes) - 1, parseInt(dia));

                if (filtroPeriodo === 'Hoje') {
                    return dataT.getDate() === hoje.getDate() && dataT.getMonth() === hoje.getMonth();
                } else if (filtroPeriodo === 'Últimos 7 dias') {
                    const seteDiasAtras = new Date();
                    seteDiasAtras.setDate(hoje.getDate() - 7);
                    return dataT >= seteDiasAtras && dataT <= hoje;
                } else {
                    return dataT.getMonth() === hoje.getMonth();
                }
            });
        }

        function atualizarDOMFinanceiro(container) {
            const trFiltradas = getTransacoesFiltradas();

            let faturamento = trFiltradas.filter(t=>t.tipo==='entrada').reduce((a,b)=>a+b.valor, 0);
            let despesas = trFiltradas.filter(t=>t.tipo==='saida').reduce((a,b)=>a+b.valor, 0);
            let lucro = faturamento - despesas;

            let transacoesHTML = trFiltradas.length === 0 
                ? `<tr><td colspan="6" class="text-center text-gray-400 italic py-4">Nenhuma transação no período selecionado.</td></tr>` 
                : trFiltradas.map(t => `
                <tr>
                    <td>${t.data}</td>
                    <td class="font-bold text-gray-700">${t.desc}</td>
                    <td>${t.cat}</td>
                    <td class="text-xs text-gray-500">${t.metodo}</td>
                    <td class="font-bold text-right ${t.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}">
                        ${t.tipo === 'entrada' ? '+' : '-'} R$ ${t.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </td>
                    <td class="text-right no-print">
                        <button onclick="abrirModalTransacao(${t.id})" class="text-blue-500 hover:text-blue-700 mr-2 text-lg" title="Editar">✏️</button>
                        <button onclick="deletarTransacao(${t.id})" class="text-red-500 hover:text-red-700 text-lg" title="Apagar">🗑️</button>
                    </td>
                </tr>
            `).join('');

            container.innerHTML = `
                <div class="grid grid-cols-3 gap-6 mb-8">
                    <div class="card border-l-4 border-green-500"><p class="text-xs font-bold text-gray-400 uppercase">Faturado (${filtroPeriodo})</p><h3 class="text-2xl font-black">R$ ${faturamento.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3></div>
                    <div class="card border-l-4 border-red-500"><p class="text-xs font-bold text-gray-400 uppercase">Despesas (${filtroPeriodo})</p><h3 class="text-2xl font-black">R$ ${despesas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3></div>
                    <div class="card border-l-4 border-blue-500"><p class="text-xs font-bold text-gray-400 uppercase">Lucro (${filtroPeriodo})</p><h3 class="text-2xl font-black text-blue-600">R$ ${lucro.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3></div>
                </div>
                <div class="card">
                    <h4 class="font-bold mb-4">Relatório de Transações</h4>
                    <table>
                        <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Método</th><th class="text-right">Valor</th><th class="text-right no-print">Ações</th></tr></thead>
                        <tbody>${transacoesHTML}</tbody>
                    </table>
                </div>
            `;
        }

        async function deletarTransacao(id) {
            if(confirm("Deseja realmente apagar esta transação?")) {
                try {
                    const res = await fetch(`http://localhost:8080/api/transacoes/${id}`, { 
                        method: 'DELETE',
                        headers: {'X-Clinic-Id': clinicaId, 'X-Usuario-Nome': clinicaLogada.nome}
                    });
                    if(res.ok) {
                        transacoes = transacoes.filter(t => t.id !== id);
                        atualizarDOMFinanceiro(document.getElementById('conteudo-dinamico'));
                    }
                } catch(error) {
                    mostrarPopup('Erro', 'Erro ao deletar transação.');
                }
            }
        }

        function atualizarEstiloBotaoTransacao() {
            const tipo = document.getElementById('new-trans-tipo').value;
            const btn = document.getElementById('modal-confirmar');
            if(tipo === 'saida') {
                btn.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';
                btn.innerText = 'Registrar Despesa';
            } else {
                btn.style.background = 'linear-gradient(90deg, #10b981, #3b82f6)';
                btn.innerText = 'Salvar Receita';
            }
        }

        function abrirModalTransacao(editId = null) {
            let t = null;
            if(editId) t = transacoes.find(x => x.id === editId);

            const hoje = new Date().toISOString().split('T')[0];
            document.getElementById('modal-titulo').innerText = editId ? "Editar Transação" : "Nova Transação";
            
            document.getElementById('modal-body').innerHTML = `
                <input id="new-trans-desc" placeholder="Descrição da Transação" class="input-pet mb-4" required>
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="text-xs font-bold text-gray-500 mb-1 block">Valor</label>
                        <input id="new-trans-val" type="text" placeholder="R$ 0,00" class="input-pet font-bold text-lg" onkeyup="mascaraMoeda(this)" required>
                    </div>
                    <div>
                        <label class="text-xs font-bold text-gray-500 mb-1 block">Data</label>
                        <input id="new-trans-data" type="date" value="${hoje}" class="input-pet" required>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="text-xs font-bold text-gray-500 mb-1 block">Tipo</label>
                        <select id="new-trans-tipo" class="input-pet" onchange="atualizarEstiloBotaoTransacao()">
                            <option value="entrada">Entrada (Receita)</option>
                            <option value="saida">Saída (Despesa)</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-bold text-gray-500 mb-1 block">Categoria</label>
                        <select id="new-trans-cat" class="input-pet">
                            <option value="Serviços">Serviços</option>
                            <option value="Venda de Produtos">Venda de Produtos</option>
                            <option value="Medicamentos">Medicamentos</option>
                            <option value="Aluguel">Aluguel</option>
                            <option value="Salários">Salários</option>
                            <option value="Impostos">Impostos</option>
                            <option value="Outros">Outros</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="text-xs font-bold text-gray-500 mb-1 block">Método</label>
                    <select id="new-trans-metodo" class="input-pet">
                        <option value="Pix">Pix</option>
                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                        <option value="Cartão de Débito">Cartão de Débito</option>
                        <option value="Dinheiro">Dinheiro</option>
                    </select>
                </div>
            `;

            if(t) {
                document.getElementById('new-trans-desc').value = t.desc;
                document.getElementById('new-trans-tipo').value = t.tipo;
                document.getElementById('new-trans-cat').value = t.cat;
                document.getElementById('new-trans-metodo').value = t.metodo;
                
                const [d, m] = t.data.split('/');
                const yyyy = new Date().getFullYear();
                document.getElementById('new-trans-data').value = `${yyyy}-${m}-${d}`;
                
                const inputVal = document.getElementById('new-trans-val');
                inputVal.value = (t.valor * 100).toString();
                mascaraMoeda(inputVal);
            }

            atualizarEstiloBotaoTransacao();

            document.getElementById('modal-confirmar').onclick = async () => {
                let valInput = document.getElementById('new-trans-val').value;
                if(!valInput) return alert("Preencha o valor!");
                
                let numLimpo = valInput.replace(/\D/g, ''); 
                let valorFloat = parseFloat(numLimpo) / 100;

                const dateParts = document.getElementById('new-trans-data').value.split('-');
                const dataFormatada = `${dateParts[2]}/${dateParts[1]}`;

                const payload = {
                    clinic_id: clinicaId,
                    data: dataFormatada,
                    descricao: document.getElementById('new-trans-desc').value,
                    categoria: document.getElementById('new-trans-cat').value,
                    valor: valorFloat,
                    tipo: document.getElementById('new-trans-tipo').value,
                    metodo: document.getElementById('new-trans-metodo').value
                };

                try {
                    if(editId) {
                        await fetch(`http://localhost:8080/api/transacoes/${editId}`, {
                            method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(payload)
                        });
                    } else {
                        await fetch(`http://localhost:8080/api/transacoes`, {
                            method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload)
                        });
                    }
                    
                    const res = await fetch(`http://localhost:8080/api/transacoes/${clinicaId}`);
                    transacoes = await res.json();
                    
                    fecharModal();
                    atualizarDOMFinanceiro(document.getElementById('conteudo-dinamico'));
                } catch(error) {
                    mostrarPopup('Erro', 'Não foi possível salvar a transação.');
                }
            };
            document.getElementById('modal-container').style.display = 'flex';
        }

        function renderEstoque() {
            if(estoque.length === 0) return `<tr><td colspan="5" class="text-center py-4 text-gray-400">Nenhum item no estoque.</td></tr>`;
            return estoque.map((p, i) => `
                <tr>
                    <td class="font-bold">${p.nome}</td>
                    <td class="text-xs text-gray-400">${p.lote}</td>
                    <td>${p.val}</td>
                    <td class="font-black text-lg ${p.qtd < 5 ? 'text-red-500' : 'text-green-600'}">${p.qtd}</td>
                    <td class="text-right">
                        <button onclick="ajustarEstoque(${i}, -1)" class="bg-gray-200 px-3 py-1 rounded font-bold text-gray-700" title="Diminuir">-</button>
                        <button onclick="ajustarEstoque(${i}, 1)" class="bg-gray-200 px-3 py-1 rounded font-bold ml-1 text-gray-700" title="Aumentar">+</button>
                        <button onclick="deletarItemEstoque(${p.id})" class="text-red-500 hover:text-red-700 ml-4 text-lg align-middle" title="Apagar Item">🗑️</button>
                    </td>
                </tr>
            `).join('');
        }

        async function ajustarEstoque(idx, qtd) {
            const item = estoque[idx];
            if(item.qtd + qtd >= 0) {
                try {
                    const novaQtd = item.qtd + qtd;
                    const res = await fetch(`http://localhost:8080/api/estoque/${item.id}/ajustar`, {
                        method: 'PUT',
                        headers: getAuthHeaders(),
                        body: JSON.stringify({ qtd: novaQtd })
                    });

                    if(res.ok) {
                        estoque[idx].qtd = novaQtd;
                        document.getElementById('tabela-estoque-corpo').innerHTML = renderEstoque();
                    }
                } catch (error) {
                    mostrarPopup('Erro', 'Não foi possível atualizar o estoque.');
                }
            }
        }

        async function deletarItemEstoque(id) {
            if(confirm("Deseja realmente excluir este item do estoque?")) {
                try {
                    const res = await fetch(`http://localhost:8080/api/estoque/${id}`, { 
                        method: 'DELETE',
                        headers: {'X-Clinic-Id': clinicaId, 'X-Usuario-Nome': clinicaLogada.nome} 
                    });
                    if(res.ok) {
                        estoque = estoque.filter(e => e.id !== id);
                        document.getElementById('tabela-estoque-corpo').innerHTML = renderEstoque();
                        mostrarPopup('✅ Sucesso', 'Item removido do estoque.');
                    } else {
                        mostrarPopup('❌ Erro', 'Não foi possível excluir o item.');
                    }
                } catch(error) {
                    mostrarPopup('🔌 Erro', 'Erro de conexão com o servidor.');
                }
            }
        }

        function abrirModalEstoque() { 
            document.getElementById('modal-titulo').innerText = "Novo Item no Estoque";
            
            document.getElementById('modal-body').innerHTML = `
                <div class="space-y-4">
                    <div>
                        <label class="text-xs font-bold text-gray-500 mb-1 block">Nome do Produto *</label>
                        <input id="new-est-nome" placeholder="Ex: Vacina V10" class="input-pet" required>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="text-xs font-bold text-gray-500 mb-1 block">Lote *</label>
                            <input id="new-est-lote" placeholder="Ex: L-1234" class="input-pet" required>
                        </div>
                        <div>
                            <label class="text-xs font-bold text-gray-500 mb-1 block">Validade *</label>
                            <input id="new-est-val" placeholder="MM/AAAA" class="input-pet" required>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="text-xs font-bold text-gray-500 mb-1 block">Quantidade Inicial *</label>
                            <input id="new-est-qtd" type="number" placeholder="0" class="input-pet" required>
                        </div>
                        <div>
                            <label class="text-xs font-bold text-gray-500 mb-1 block">Custo de Aquisição (R$)</label>
                            <input id="new-est-valor" type="text" placeholder="R$ 0,00" class="input-pet" onkeyup="mascaraMoeda(this)">
                        </div>
                    </div>
                    <div>
                        <label class="text-xs font-bold text-gray-500 mb-1 block">Fornecedor</label>
                        <input id="new-est-fornecedor" placeholder="Nome da empresa fornecedora" class="input-pet">
                    </div>
                    <div>
                        <label class="text-xs font-bold text-gray-500 mb-1 block">Descrição Adicional</label>
                        <textarea id="new-est-desc" placeholder="Detalhes sobre o produto..." class="input-pet" rows="2"></textarea>
                    </div>
                    
                    <div class="flex items-center gap-2 mt-4 bg-blue-50 p-4 rounded-xl border border-blue-200">
                        <input type="checkbox" id="new-est-transacao" class="w-5 h-5 cursor-pointer accent-blue-600">
                        <label for="new-est-transacao" class="text-sm font-bold text-blue-800 cursor-pointer">
                            Gerar despesa no financeiro automaticamente?
                        </label>
                    </div>
                </div>
            `;

            document.getElementById('modal-confirmar').onclick = async () => {
                const nome = document.getElementById('new-est-nome').value.trim();
                const lote = document.getElementById('new-est-lote').value.trim();
                const val = document.getElementById('new-est-val').value.trim();
                const qtd = parseInt(document.getElementById('new-est-qtd').value || 0);
                const fornecedor = document.getElementById('new-est-fornecedor').value.trim();
                const descricao = document.getElementById('new-est-desc').value.trim();

                let valInput = document.getElementById('new-est-valor').value;
                let numLimpo = valInput.replace(/\D/g, ''); 
                let valorFloat = numLimpo ? parseFloat(numLimpo) / 100 : 0;

                const gerarTransacao = document.getElementById('new-est-transacao').checked;

                if (!nome || !lote || !val || isNaN(qtd)) {
                    return mostrarPopup('⚠️ Atenção', 'Preencha os campos obrigatórios (*).');
                }

                if (gerarTransacao && valorFloat === 0) {
                    return mostrarPopup('⚠️ Atenção', 'Para gerar uma transação financeira, o Custo de Aquisição deve ser maior que zero.');
                }

                const payload = {
                    clinic_id: clinicaId,
                    nome, lote, val, qtd, fornecedor, descricao, valor: valorFloat, gerarTransacao
                };

                try {
                    const res = await fetch('http://localhost:8080/api/estoque', {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify(payload)
                    });
                    
                    if (res.ok) {
                        const estRes = await fetch(`http://localhost:8080/api/estoque/${clinicaId}`);
                        estoque = await estRes.json();
                        
                        if (gerarTransacao) {
                            const transRes = await fetch(`http://localhost:8080/api/transacoes/${clinicaId}`);
                            transacoes = await transRes.json();
                        }

                        fecharModal();
                        document.getElementById('tabela-estoque-corpo').innerHTML = renderEstoque();
                        mostrarPopup('✅ Sucesso', 'Item adicionado ao estoque!');
                    } else {
                        mostrarPopup('❌ Erro', 'Falha ao salvar o item.');
                    }
                } catch (error) {
                    mostrarPopup('🔌 Erro', 'Verifique a conexão com o servidor.');
                }
            };
            
            document.getElementById('modal-container').style.display = 'flex';
        }

        function fecharModal() { 
            const btn = document.getElementById('modal-confirmar');
            btn.style.background = ''; 
            btn.innerText = 'Salvar';
            document.getElementById('modal-container').style.display = 'none'; 
        }

        function mostrarPopup(titulo, mensagem) {
            document.getElementById('popup-titulo').innerText = titulo;
            document.getElementById('popup-mensagem').innerText = mensagem;
            document.getElementById('popup-container').style.display = 'flex';
        }

        function fecharPopup() {
            document.getElementById('popup-container').style.display = 'none';
        }

        function validarEtapa1() {
            const nome = document.getElementById('clinica-nome').value.trim();
            const cnpj = document.getElementById('clinica-cnpj').value.trim();
            const telefone = document.getElementById('clinica-telefone').value.trim();
            const email = document.getElementById('clinica-email').value.trim();
            const senha = document.getElementById('clinica-senha').value.trim();

            if (!nome || !cnpj || !telefone || !email || !senha) return mostrarPopup('⚠️', 'Preencha os campos.');
            if (senha.length < 6) return mostrarPopup('⚠️', 'A senha deve ter no mínimo 6 caracteres.');
            
            dadosClinica = { nome, cnpj, telefone, email, senha };
            
            document.getElementById('etapa-1').classList.add('hidden');
            document.getElementById('etapa-2').classList.remove('hidden');
            renderizarColaboradores();
        }

        function renderizarColaboradores() {
            const container = document.getElementById('colaboradores-lista');
            let formNovo = `
                <div class="bg-white border border-gray-200 p-4 rounded-lg mt-4">
                    <h4 class="font-bold mb-4 text-gray-800">Adicionar Colaborador</h4>
                    <div class="space-y-3">
                        <input id="novo-colab-nome" placeholder="Ex: João da Silva" class="input-pet mb-2">
                        <div class="grid grid-cols-2 gap-3 mb-2">
                            <input id="novo-colab-cpf" onkeyup="mascaraCPF(this)" placeholder="CPF" class="input-pet">
                            <select id="novo-colab-cargo" class="input-pet">
                                <option value="">Cargo...</option><option value="Veterinário">Veterinário</option><option value="Recepção">Recepção</option><option value="Administrador">Administrador</option>
                            </select>
                        </div>
                        <input id="novo-colab-email" type="email" placeholder="E-mail" class="input-pet mb-2">
                        <button onclick="adicionarColaboradorForm()" class="w-full btn-principal py-3 rounded-xl font-bold">+ Adicionar Colaborador</button>
                    </div>
                </div>`;

            if (colaboradoresCheckout.length === 0) {
                container.innerHTML = '<div class="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4"><p class="text-gray-400 text-center">Nenhum colaborador adicionado ainda.</p></div>' + formNovo;
            } else {
                let listaHtml = colaboradoresCheckout.map((colab, index) => `
                    <div class="bg-gray-50 p-4 rounded-lg border mb-3 flex justify-between items-start">
                        <div><p class="font-bold">${colab.nome}</p><p class="text-sm text-gray-600">${colab.cargo} - ${colab.email}</p></div>
                        <button onclick="removerColaborador(${index})" class="text-red-500 font-bold hover:text-red-700">Remover</button>
                    </div>
                `).join('');
                container.innerHTML = listaHtml + formNovo;
            }
        }

        function adicionarColaboradorForm() {
            const nome = document.getElementById('novo-colab-nome').value.trim();
            const cpf = document.getElementById('novo-colab-cpf').value.trim();
            const cargo = document.getElementById('novo-colab-cargo').value.trim();
            const email = document.getElementById('novo-colab-email').value.trim();

            if (!nome || !cpf || !cargo || !email) return mostrarPopup('⚠️', 'Preencha os dados.');
            
            colaboradoresCheckout.push({ nome, cpf, cargo, email });
            renderizarColaboradores();
        }

        function removerColaborador(index) {
            colaboradoresCheckout.splice(index, 1);
            renderizarColaboradores();
        }

        function validarEtapa2() {
            document.getElementById('etapa-2').classList.add('hidden');
            document.getElementById('etapa-3').classList.remove('hidden');
            document.getElementById('resumo-plano').innerText = planoSelecionado.nome;
            document.getElementById('resumo-total').innerText = 'R$ ' + planoSelecionado.preco + '/mês';
        }

        function voltarEtapa2() { document.getElementById('etapa-2').classList.add('hidden'); document.getElementById('etapa-1').classList.remove('hidden'); }
        function voltarEtapa3() { document.getElementById('etapa-3').classList.add('hidden'); document.getElementById('etapa-2').classList.remove('hidden'); }

        async function finalizarCadastro() {
            try {
                const response = await fetch('http://localhost:8080/api/assinatura-completa', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        clinica: {
                            nome: dadosClinica.nome,
                            cnpj: dadosClinica.cnpj,
                            telefone: dadosClinica.telefone,
                            emailAdmin: dadosClinica.email,
                            senhaAdmin: dadosClinica.senha
                        },
                        colaboradores: colaboradoresCheckout
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    mostrarPopup('✅ Cadastro Concluído', 'Cadastro realizado com sucesso! Faça seu login para começar.');
                    planoSelecionado = { nome: '', preco: 0 };
                    dadosClinica = {};
                    colaboradoresCheckout = [];
                    irPara('tela-login');
                } else {
                    mostrarPopup('❌ Erro no Cadastro', result.error || 'Erro ao processar cadastro.');
                }
            } catch (error) {
                mostrarPopup('🔌 Erro', 'Verifique se o servidor está rodando na porta 8080.');
            }
        }
        function atualizarLogoSidebar() {
            const container = document.getElementById('clinica-logo-container');
            if (clinicaLogada.logo) {
                container.innerHTML = `<img src="${clinicaLogada.logo}" alt="Logo Clínica" class="w-8 h-8 rounded-full object-cover"> <span class="truncate text-lg">${clinicaLogada.nomeClinica}</span>`;
            } else {
                container.innerHTML = `🐾 Mundo Pet`;
            }
        }

        async function salvarConfiguracoesClinica() {
            const novoNome = document.getElementById('config-nome-clinica').value;
            const novoCNPJ = document.getElementById('config-cnpj-clinica').value;
            const novoTelefone = document.getElementById('config-telefone-clinica').value;
            const novoEndereco = document.getElementById('config-endereco-clinica').value;
            const novoEmail = document.getElementById('config-email-contato').value;
            
            const novasCategorias = document.getElementById('config-categorias-prontuario-hidden').value;
            const novosAnimais = document.getElementById('config-tipos-animais-hidden').value;
            const novosCargos = document.getElementById('config-cargos-hidden').value;

            try {
                const res = await fetch(`http://localhost:8080/api/clinica/${clinicaLogada.id}`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ 
                        nome: novoNome, cnpj: novoCNPJ, telefone: novoTelefone, 
                        endereco: novoEndereco, email_contato: novoEmail, 
                        categorias_prontuario: novasCategorias, tipos_animais: novosAnimais, cargos: novosCargos 
                    })
                });

                if (res.ok) {
                    clinicaLogada.nomeClinica = novoNome;
                    clinicaLogada.categorias_prontuario = novasCategorias;
                    clinicaLogada.tipos_animais = novosAnimais;
                    clinicaLogada.cargos = novosCargos;

                    document.getElementById('clinica-tag').innerText = novoNome;
                    if(typeof atualizarLogoSidebar === 'function') atualizarLogoSidebar();
                    mostrarPopup('✅ Sucesso', 'Configurações da clínica atualizadas!');
                } else {
                    mostrarPopup('❌ Erro', 'Não foi possível atualizar a clínica.');
                }
            } catch(e) {
                mostrarPopup('❌ Erro', 'Falha na conexão com o servidor.');
            }
        }
        
        async function salvarNovaSenha() {
            const novaSenha = document.getElementById('config-nova-senha').value;
            if (!novaSenha || novaSenha.length < 6) {
                return mostrarPopup('⚠️ Atenção', 'A senha deve ter pelo menos 6 caracteres.');
            }

            try {
                const res = await fetch(`http://localhost:8080/api/usuario/senha`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ email: clinicaLogada.email, senha: novaSenha })
                });

                if (res.ok) {
                    document.getElementById('config-nova-senha').value = '';
                    mostrarPopup('✅ Sucesso', 'Senha alterada com sucesso!');
                } else {
                    mostrarPopup('❌ Erro', 'Não foi possível alterar a senha.');
                }
            } catch(e) {
                mostrarPopup('❌ Erro', 'Falha na conexão com o servidor.');
            }
        }
        
        function previewLogoFile(input) {
            const file = input.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('config-logo-base64').value = e.target.result;
                    const preview = document.getElementById('preview-logo');
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        }

        function inicializarSelect(selectId, valoresString) {
            const select = document.getElementById(selectId);
            if (!select) return;
            select.innerHTML = '';
            if (valoresString) {
                const valores = valoresString.split(',').map(v => v.trim()).filter(v => v);
                valores.forEach(v => {
                    const opt = document.createElement('option');
                    opt.value = v;
                    opt.innerText = v;
                    select.appendChild(opt);
                });
            }
        }

        function adicionarOpcao(inputId, selectId, hiddenId) {
            const input = document.getElementById(inputId);
            const select = document.getElementById(selectId);
            const valor = input.value.trim();
            if (valor) {
                let existe = false;
                for (let i = 0; i < select.options.length; i++) {
                    if (select.options[i].value.toLowerCase() === valor.toLowerCase()) existe = true;
                }
                if (!existe) {
                    const opt = document.createElement('option');
                    opt.value = valor;
                    opt.innerText = valor;
                    select.appendChild(opt);
                    atualizarHidden(selectId, hiddenId);
                    input.value = '';
                } else {
                    mostrarPopup('⚠️ Atenção', 'Esta opção já existe na lista.');
                }
            }
        }

        function removerOpcao(selectId, hiddenId) {
            const select = document.getElementById(selectId);
            if (select.selectedIndex !== -1) {
                select.remove(select.selectedIndex);
                atualizarHidden(selectId, hiddenId);
            }
        }

        function atualizarHidden(selectId, hiddenId) {
            const select = document.getElementById(selectId);
            const valores = [];
            for (let i = 0; i < select.options.length; i++) {
                valores.push(select.options[i].value);
            }
            document.getElementById(hiddenId).value = valores.join(', ');
        }

        function logout() {
            clinicaLogada = null;
            clinicaId = null;
            location.reload();
        }

        function abrirModalAgendamento() {
    document.getElementById('modal-titulo').innerText = "Novo Agendamento";
    document.getElementById('modal-body').innerHTML = `
        <div class="space-y-4">
            <div>
                <label class="text-xs font-bold text-gray-500 mb-1 block">Nome do Cliente *</label>
                <select id="agenda-cliente" class="input-pet">
                    <option value="">Coloque o nome do cliente</option>
                </select>
            </div>
            <div>
                <label class="text-xs font-bold text-gray-500 mb-1 block">Nome do Pet *</label>
                <input id="agenda-pet" placeholder="Selecione o cliente primeiro" class="input-pet bg-gray-100 cursor-not-allowed" required disabled>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="text-xs font-bold text-gray-500 mb-1 block">Data *</label>
                    <input id="agenda-data" type="date" class="input-pet" required>
                </div>
                <div>
                    <label class="text-xs font-bold text-gray-500 mb-1 block">Hora *</label>
                    <input id="agenda-hora" type="time" class="input-pet" required>
                </div>
            </div>
            <div>
                <label class="text-xs font-bold text-gray-500 mb-1 block">Tipo de Atendimento</label>
                <select id="agenda-tipo" class="input-pet" onchange="document.getElementById('container-especialidade').style.display = this.value === 'Consulta' ? 'block' : 'none'">
                    <option value="Consulta">Consulta</option>
                    <option value="Retorno">Retorno</option>
                    <option value="Exame">Exame</option>
                    <option value="Vacina">Vacina</option>
                    <option value="Banho/Tosa">Banho/Tosa</option>
                </select>
            </div>
            <div id="container-especialidade" style="display: block;">
                <label class="text-xs font-bold text-gray-500 mb-1 block">Especialidade</label>
                <select id="agenda-especialidade" class="w-full p-2 border rounded mt-1" onchange="atualizarVeterinarios()">
                    <option value="Clínica Geral">Clínica Geral</option>
                    <option value="Cardiologia">Cardiologia</option>
                </select>
            </div>
            <div id="div-veterinario" style="display: none;" class="mt-4">
                <label class="block text-sm font-semibold text-gray-700">Veterinário</label>
                <select id="agenda-veterinario" class="w-full p-2 border rounded mt-1"></select>
            </div>
            <div>
                <label class="text-xs font-bold text-gray-500 mb-1 block">Observações</label>
                <textarea id="agenda-obs" placeholder="Motivo da consulta, sintomas, etc..." class="input-pet" rows="2"></textarea>
            </div>
        </div>
    `;

        // Ativa o input de Pet apenas se um cliente for selecionado
        document.getElementById('agenda-cliente').addEventListener('change', function() {
            const petInput = document.getElementById('agenda-pet');
            if (this.value !== "") {
                petInput.disabled = false;
                petInput.classList.remove('bg-gray-100', 'cursor-not-allowed');
                petInput.placeholder = "Ex: Rex";
            } else {
                petInput.disabled = true;
                petInput.classList.add('bg-gray-100', 'cursor-not-allowed');
                petInput.placeholder = "Selecione o cliente primeiro";
                petInput.value = ""; 
            }
        });

        fetch(`http://localhost:8080/api/clientes/${clinicaId}`) // Ajuste a rota se a sua URL de clientes for diferente
            .then(res => res.json())
            .then(clientes => {
                const selectCliente = document.getElementById('agenda-cliente');
                if (clientes && clientes.length > 0) {
                    selectCliente.innerHTML = '<option value="">Selecione o Cliente</option>' + 
                        clientes.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
                } else {
                    selectCliente.innerHTML = '<option value="">Nenhum cliente cadastrado</option>';
                }
            })
            .catch(err => {
                console.error("Erro ao carregar clientes:", err);
                document.getElementById('agenda-cliente').innerHTML = '<option value="">Erro ao carregar</option>';
            });

    document.getElementById('modal-confirmar').onclick = async () => {
        const cliente = document.getElementById('agenda-cliente').value;
        const pet = document.getElementById('agenda-pet').value;
        const data = document.getElementById('agenda-data').value;
        const hora = document.getElementById('agenda-hora').value;
        const tipo = document.getElementById('agenda-tipo').value;
        const obs = document.getElementById('agenda-obs').value;
        const especialidade = document.getElementById('agenda-especialidade').value; // <-- LINHA ADICIONADA
        const vetSelect = document.getElementById('agenda-veterinario');
        const veterinario = vetSelect && vetSelect.value ? vetSelect.value : null;

        if (!cliente || !pet || !data || !hora) {
            return mostrarPopup('⚠️ Atenção', 'Preencha Cliente, Pet, Data e Hora.');
        }

        const novoAgendamento = { clinic_id: clinicaId, cliente, pet, data, hora, tipo, especialidade: tipo === 'Consulta' ? especialidade : null, veterinario: tipo === 'Consulta' ? veterinario : null, obs };

        try {
            await fetch('http://localhost:8080/api/agenda', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(novoAgendamento)
            });
        } catch(e) {
            console.log("Aviso: Servidor de agenda não encontrado na 8080. Salvando localmente para visualização.");
        }
        
        // Adiciona à lista local imediatamente
        agendamentos.push(novoAgendamento);

        mostrarPopup('✅ Sucesso', 'Agendamento salvo com sucesso!');
        fecharModal();
        
        // Atualiza a tela do calendário para exibir o novo item na hora
        if (typeof window.renderizarCalendario === 'function') {
            window.renderizarCalendario();
        }
    };

    document.getElementById('modal-container').style.display = 'flex';
}

window.atualizarVeterinarios = function() {
    const especialidade = document.getElementById('agenda-especialidade').value;
    const selectVet = document.getElementById('agenda-veterinario');
    const divVet = document.getElementById('div-veterinario');

    if (!especialidade) {
        divVet.style.display = 'none';
        selectVet.innerHTML = '';
        return;
    }

    // Filtra a variável global "equipe" pela especialidade selecionada
    // Garante que lista apenas quem é veterinário/tem a especialidade
    const veterinarios = equipe.filter(colab => colab.especialidade === especialidade);

    if (veterinarios.length > 0) {
        divVet.style.display = 'block';
        selectVet.innerHTML = '<option value="">Selecione o Veterinário...</option>' + 
            veterinarios.map(v => `<option value="${v.nome}">${v.nome}</option>`).join('');
    } else {
        divVet.style.display = 'block';
        selectVet.innerHTML = '<option value="">Nenhum veterinário desta especialidade encontrado</option>';
    }
};