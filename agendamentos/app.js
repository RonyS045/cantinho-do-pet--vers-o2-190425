/**
 * app.js - Sistema de Agendamentos Cantinho do Pet
 * Versão final para implantação
 * Últimas atualizações:
 * - Implementação do tema claro/escuro
 * - Melhorias no comprovante de agendamento
 * - Otimização do código existente
 * - Correção de bugs menores
 */

// Variáveis globais
let agendamentos = [];
let calendar = null;
let editMode = false;
let currentEditId = null;
let agendamentoAtual = null;

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', async function() {
    await inicializarCalendario();
    configurarFormulario();
    configurarEventosUI();
    configurarServicosMultiplos();
    configurarTema(); // Configura o sistema de temas
    await atualizarInterface();
});

// ========== CONFIGURAÇÃO DO TEMA ========== //
function configurarTema() {
    const themeToggle = document.getElementById('theme-toggle');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Verifica preferência armazenada ou do sistema
    const currentTheme = localStorage.getItem('theme') || 
                       (prefersDarkScheme.matches ? 'dark' : 'light');
    
    // Aplica o tema inicial
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i> Modo Claro';
    }
    
    // Alterna entre temas
    themeToggle.addEventListener('click', function() {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        themeToggle.innerHTML = isDark 
            ? '<i class="fas fa-sun"></i> Modo Claro' 
            : '<i class="fas fa-moon"></i> Modo Escuro';
        
        // Atualiza o calendário se existir
        if (calendar) {
            calendar.render();
        }
    });
    
    // Atualiza o tema se a preferência do sistema mudar
    prefersDarkScheme.addListener(e => {
        const newTheme = e.matches ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        if (newTheme === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i> Modo Claro';
        } else {
            document.body.classList.remove('dark-mode');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i> Modo Escuro';
        }
    });
}

// ========== CALENDÁRIO ========== //
async function inicializarCalendario() {
    calendar = new FullCalendar.Calendar(document.getElementById('calendario'), {
        initialView: 'dayGridMonth',
        locale: 'pt-br',
        themeSystem: 'bootstrap5',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: await carregarAgendamentosParaCalendario(),
        eventClick: function(info) {
            editarAgendamento(parseInt(info.event.id));
        },
        eventBackgroundColor: 'var(--secondary-color)',
        eventBorderColor: 'var(--secondary-color)'
    });
    calendar.render();
}

// ========== FORMULÁRIO ========== //
function configurarFormulario() {
    const form = document.getElementById('form-agendamento');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!validarFormulario()) {
            mostrarAlerta('Atenção!', 'Por favor, preencha todos os campos obrigatórios', 'warning');
            return;
        }
        
        const servicos = Array.from(document.querySelectorAll('.servico-input'))
            .map(input => input.value.trim())
            .filter(val => val);
            
        const valoresServicos = Array.from(document.querySelectorAll('.valor-servico'))
            .map(input => parseFloat(input.value))
            .filter(val => !isNaN(val));

        if (servicos.length === 0 || servicos.length !== valoresServicos.length) {
            mostrarAlerta('Atenção!', 'Por favor, verifique os serviços e valores informados', 'warning');
            return;
        }

        const agendamento = {
            id: editMode ? currentEditId : Date.now(),
            nome: document.getElementById('nomeCliente').value.trim(),
            servicos: servicos,
            valoresServicos: valoresServicos,
            data: document.getElementById('data').value,
            hora: document.getElementById('horario').value,
            valor: parseFloat(document.getElementById('valor').value),
            observacoes: document.getElementById('observacoes').value.trim(),
            dataCriacao: new Date().toISOString()
        };

        try {
            if (editMode) {
                await atualizarAgendamento(agendamento);
                mostrarAlerta('Sucesso!', 'Agendamento atualizado com sucesso', 'success');
            } else {
                await salvarAgendamento(agendamento);
                mostrarAlerta('Sucesso!', 'Agendamento confirmado com sucesso', 'success');
            }
            
            await atualizarInterface();
            form.reset();
            sairModoEdicao();
            
            // Mostrar comprovante após salvar
            mostrarComprovante(agendamento);
            
        } catch (error) {
            console.error('Erro no formulário:', error);
            mostrarAlerta('Erro!', error.message.includes('horário') 
                ? error.message 
                : 'Ocorreu um erro ao processar o agendamento', 'error');
        }
    });
}

// ========== CONFIGURAÇÃO DE EVENTOS ========== //
function configurarEventosUI() {
    // Botão de confirmação de exclusão
    document.getElementById('confirmDelete').addEventListener('click', async function() {
        const id = parseInt(this.dataset.idToDelete);
        if (id) {
            try {
                await excluirAgendamento(id);
                await atualizarInterface();
                bootstrap.Modal.getInstance(document.getElementById('confirmModal')).hide();
                mostrarAlerta('Sucesso!', 'Agendamento excluído com sucesso', 'success');
            } catch (error) {
                console.error('Erro ao excluir agendamento:', error);
                mostrarAlerta('Erro!', 'Não foi possível excluir o agendamento', 'error');
            }
        }
    });

    // Botão cancelar edição
    document.getElementById('cancel-edit').addEventListener('click', sairModoEdicao);
    
    // Botão compartilhar via WhatsApp
    document.getElementById('share-whatsapp').addEventListener('click', compartilharAgendamentoAtual);
}

// ========== SERVIÇOS MÚLTIPLOS ========== //
function configurarServicosMultiplos() {
    const container = document.getElementById('servicos-container');
    const addBtn = document.getElementById('add-servico');

    addBtn.addEventListener('click', () => {
        const novoServico = `
            <div class="input-group mb-2">
                <input type="text" class="form-control servico-input" placeholder="Nome do serviço" required>
                <input type="number" class="form-control valor-servico" placeholder="Valor (R$)" min="0" step="0.01" required>
                <button type="button" class="btn btn-outline-danger remove-servico">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', novoServico);
        atualizarBotoesRemover();
    });

    container.addEventListener('input', function(e) {
        if (e.target.classList.contains('servico-input') || e.target.classList.contains('valor-servico')) {
            calcularValorTotal();
        }
    });
    
    container.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-servico')) {
            e.target.closest('.input-group').remove();
            atualizarBotoesRemover();
            calcularValorTotal();
        }
    });
}

function atualizarBotoesRemover() {
    const botoes = document.querySelectorAll('.remove-servico');
    botoes.forEach((btn, index) => {
        btn.disabled = index === 0;
    });
}

function calcularValorTotal() {
    const valoresInputs = Array.from(document.querySelectorAll('.valor-servico'));
    let total = 0;
    
    valoresInputs.forEach(input => {
        if (input.value) {
            total += parseFloat(input.value) || 0;
        }
    });
    
    document.getElementById('valor').value = total.toFixed(2);
}

// ========== OPERAÇÕES CRUD ========== //
async function carregarAgendamentos() {
    try {
        const dados = await localforage.getItem('agendamentos');
        return dados ? dados : [];
    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        mostrarAlerta('Erro!', 'Não foi possível carregar os agendamentos', 'error');
        return [];
    }
}

async function carregarAgendamentosParaCalendario() {
    const agendamentos = await carregarAgendamentos();
    return agendamentos.map(a => ({
        id: a.id.toString(),
        title: `${a.nome} - ${a.servicos.length} serviço(s)`,
        start: `${a.data}T${a.hora}`,
        extendedProps: {
            servicos: a.servicos,
            valoresServicos: a.valoresServicos,
            valor: a.valor,
            observacoes: a.observacoes
        }
    }));
}

async function salvarAgendamento(novoAgendamento) {
    try {
        let agendamentos = await carregarAgendamentos();
        
        // Verifica conflito de horário
        const conflito = agendamentos.some(ag => 
            ag.data === novoAgendamento.data && 
            ag.hora === novoAgendamento.hora &&
            ag.id !== novoAgendamento.id
        );
        
        if (conflito) {
            throw new Error('Já existe um agendamento para este horário');
        }

        agendamentos.push(novoAgendamento);
        await localforage.setItem('agendamentos', agendamentos);
        return true;
    } catch (error) {
        console.error('Erro ao salvar agendamento:', error);
        throw error;
    }
}

async function atualizarAgendamento(agendamentoAtualizado) {
    try {
        let agendamentos = await carregarAgendamentos();
        const index = agendamentos.findIndex(a => a.id === agendamentoAtualizado.id);
        
        if (index === -1) {
            throw new Error('Agendamento não encontrado para atualização');
        }

        // Verifica conflito de horário com outros agendamentos
        const conflito = agendamentos.some((ag, i) => 
            i !== index &&
            ag.data === agendamentoAtualizado.data && 
            ag.hora === agendamentoAtualizado.hora
        );
        
        if (conflito) {
            throw new Error('Já existe outro agendamento para este horário');
        }

        agendamentos[index] = agendamentoAtualizado;
        await localforage.setItem('agendamentos', agendamentos);
        return true;
    } catch (error) {
        console.error('Erro ao atualizar agendamento:', error);
        throw error;
    }
}

async function excluirAgendamento(id) {
    try {
        let agendamentos = await carregarAgendamentos();
        const novoTotal = agendamentos.filter(a => a.id !== id).length;
        
        if (agendamentos.length === novoTotal) {
            throw new Error('Agendamento não encontrado para exclusão');
        }

        agendamentos = agendamentos.filter(a => a.id !== id);
        await localforage.setItem('agendamentos', agendamentos);
        return true;
    } catch (error) {
        console.error('Erro ao excluir agendamento:', error);
        throw error;
    }
}

// ========== ATUALIZAÇÃO DA INTERFACE ========== //
async function atualizarInterface() {
    try {
        agendamentos = await carregarAgendamentos();
        
        // Atualiza calendário
        calendar.removeAllEvents();
        const eventosCalendario = await carregarAgendamentosParaCalendario();
        calendar.addEventSource(eventosCalendario);
        
        // Atualiza lista
        const listaEl = document.getElementById('agendamentos-lista');
        listaEl.innerHTML = agendamentos.map(a => criarItemLista(a)).join('');
    } catch (error) {
        console.error('Erro ao atualizar interface:', error);
        mostrarAlerta('Erro!', 'Não foi possível carregar os agendamentos', 'error');
    }
}

function criarItemLista(agendamento) {
    const servicosList = agendamento.servicos.map((s, i) => {
        const valor = agendamento.valoresServicos?.[i] || 0;
        return `<li>${s} - R$ ${valor.toFixed(2)}</li>`;
    }).join('');
    
    return `
        <li class="list-group-item" data-id="${agendamento.id}">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <strong>${agendamento.nome}</strong>
                    <small class="d-block">${formatarData(agendamento.data)} às ${agendamento.hora}</small>
                    <div class="mt-2">
                        <strong>Serviços:</strong>
                        <ul class="mb-1">${servicosList}</ul>
                        <strong>Valor Total:</strong> R$ ${agendamento.valor.toFixed(2)}
                    </div>
                    ${agendamento.observacoes ? `<p class="mt-1"><em>${agendamento.observacoes}</em></p>` : ''}
                </div>
                <div>
                    <button class="btn btn-sm btn-warning me-1" onclick="editarAgendamento(${agendamento.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="prepararExclusao(${agendamento.id})">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                </div>
            </div>
        </li>
    `;
}

// ========== COMPROVANTE (ATUALIZADO) ========== //
function mostrarComprovante(agendamento) {
    const comprovanteModal = new bootstrap.Modal(document.getElementById('comprovanteModal'));
    document.getElementById('comprovante-content').innerHTML = gerarComprovante(agendamento);
    agendamentoAtual = agendamento;
    comprovanteModal.show();
}

function gerarComprovante(agendamento) {
    const servicosList = agendamento.servicos.map((s, i) => {
        const valor = agendamento.valoresServicos?.[i] || 0;
        return `<li><strong>${s}</strong> - <span class="valor-destaque">R$ ${valor.toFixed(2)}</span></li>`;
    }).join('');
    
    const dataFormatada = formatarData(agendamento.data);
    const dataEmissao = new Date().toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
    });
    const horaEmissao = new Date().toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });

    return `
        <div class="comprovante">
            <div class="text-center">
                <img src="/assets/logo/WhatsApp Image 2025-04-18 at 15.16.34.jpeg" alt="Logo Cantinho do Pet" class="mb-2">
                <h4>Cantinho do Pet</h4>
                <h5>COMPROVANTE DE AGENDAMENTO</h5>
            </div>
            
            <div class="mb-3">
                <h6>INFORMAÇÕES DO CLIENTE</h6>
                <p><strong>Nome:</strong> ${agendamento.nome}</p>
                <p><strong>Data do Agendamento:</strong> ${dataEmissao}</p>
            </div>
            
            <div class="mb-3">
                <h6>DETALHES DO SERVIÇO</h6>
                <p><strong>Data:</strong> ${dataFormatada}</p>
                <p><strong>Horário:</strong> ${agendamento.hora}</p>
                
                <h6 class="mt-3">SERVIÇOS CONTRATADOS</h6>
                <ul>${servicosList}</ul>
                
                <p class="mt-3"><strong>Valor Total:</strong> <span class="valor-destaque">R$ ${agendamento.valor.toFixed(2)}</span></p>
                
                ${agendamento.observacoes ? `
                <h6 class="mt-3">OBSERVAÇÕES</h6>
                <p>${agendamento.observacoes}</p>
                ` : ''}
            </div>
            
            <div class="alert alert-light text-center mt-4">
                <small>Comprovante gerado em ${dataEmissao} às ${horaEmissao}</small>
            </div>
        </div>
    `;
}

function compartilharAgendamentoAtual() {
    if (!agendamentoAtual) return;
    compartilharWhatsApp(agendamentoAtual);
}

function compartilharWhatsApp(agendamento) {
    const servicosText = agendamento.servicos.map((s, i) => {
        const valor = agendamento.valoresServicos?.[i] || 0;
        return `• ${s} - R$ ${valor.toFixed(2)}`;
    }).join('%0A');
    
    const observacoesText = agendamento.observacoes ? `%0A%0A📝 *Observações:* ${agendamento.observacoes}` : '';
    const dataFormatada = formatarData(agendamento.data);
    
    const texto = `✅ *AGENDAMENTO CONFIRMADO - CANTINHO DO PET* ✅%0A%0A` +
                  `🐾 *Cliente:* ${agendamento.nome}%0A` +
                  `📅 *Data:* ${dataFormatada}%0A` +
                  `⏰ *Horário:* ${agendamento.hora}%0A` +
                  `💼 *Serviços:*%0A${servicosText}%0A` +
                  `💰 *Valor Total:* R$ ${agendamento.valor.toFixed(2)}${observacoesText}%0A%0A` +
                  `_Agradecemos pela preferência! 🐶😸_`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
}

// ========== FUNÇÕES AUXILIARES ========== //
function formatarData(dataString) {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dataString).toLocaleDateString('pt-BR', options);
}

function validarFormulario() {
    const camposObrigatorios = ['nomeCliente', 'data', 'horario', 'valor'];
    let valido = true;

    camposObrigatorios.forEach(id => {
        const campo = document.getElementById(id);
        if (!campo.value) {
            campo.classList.add('is-invalid');
            valido = false;
        } else {
            campo.classList.remove('is-invalid');
        }
    });

    // Validação dos serviços
    const servicos = Array.from(document.querySelectorAll('.servico-input'))
        .map(input => input.value.trim())
        .filter(val => val);
        
    const valores = Array.from(document.querySelectorAll('.valor-servico'))
        .map(input => input.value)
        .filter(val => val);

    if (servicos.length === 0 || valores.length === 0 || servicos.length !== valores.length) {
        document.querySelector('.servico-input').classList.add('is-invalid');
        document.querySelector('.valor-servico').classList.add('is-invalid');
        valido = false;
    } else {
        document.querySelector('.servico-input').classList.remove('is-invalid');
        document.querySelector('.valor-servico').classList.remove('is-invalid');
    }

    return valido;
}

function mostrarAlerta(titulo, mensagem, tipo) {
    Swal.fire({
        title: titulo,
        text: mensagem,
        icon: tipo,
        confirmButtonColor: '#6a11cb'
    });
}

// ========== MODO DE EDIÇÃO ========== //
function entrarModoEdicao(agendamento) {
    editMode = true;
    currentEditId = agendamento.id;
    agendamentoAtual = agendamento;
    
    document.getElementById('nomeCliente').value = agendamento.nome;
    document.getElementById('data').value = agendamento.data;
    document.getElementById('horario').value = agendamento.hora;
    document.getElementById('valor').value = agendamento.valor.toFixed(2);
    document.getElementById('observacoes').value = agendamento.observacoes || '';
    
    // Preencher serviços
    const servicosContainer = document.getElementById('servicos-container');
    servicosContainer.innerHTML = '';
    
    agendamento.servicos.forEach((servico, index) => {
        const valor = agendamento.valoresServicos?.[index] || 0;
        const div = document.createElement('div');
        div.className = 'input-group mb-2';
        div.innerHTML = `
            <input type="text" class="form-control servico-input" value="${servico}" required>
            <input type="number" class="form-control valor-servico" value="${valor.toFixed(2)}" min="0" step="0.01" required>
            <button type="button" class="btn btn-outline-danger remove-servico ${index === 0 ? 'disabled' : ''}">
                <i class="fas fa-times"></i>
            </button>
        `;
        servicosContainer.appendChild(div);
    });
    
    document.getElementById('form-title').textContent = 'Editar Agendamento';
    document.getElementById('cancel-edit').classList.remove('d-none');
    document.getElementById('form-agendamento').scrollIntoView({ behavior: 'smooth' });
}

function sairModoEdicao() {
    editMode = false;
    currentEditId = null;
    agendamentoAtual = null;
    
    document.getElementById('form-agendamento').reset();
    document.getElementById('form-title').textContent = 'Novo Agendamento';
    document.getElementById('cancel-edit').classList.add('d-none');
    
    // Resetar serviços
    const servicosContainer = document.getElementById('servicos-container');
    servicosContainer.innerHTML = `
        <div class="input-group mb-2">
            <input type="text" class="form-control servico-input" placeholder="Nome do serviço" required>
            <input type="number" class="form-control valor-servico" placeholder="Valor (R$)" min="0" step="0.01" required>
            <button type="button" class="btn btn-outline-danger remove-servico" disabled>
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    document.getElementById('valor').value = '';
}

// ========== FUNÇÕES GLOBAIS ========== //
window.prepararExclusao = function(id) {
    const confirmBtn = document.getElementById('confirmDelete');
    confirmBtn.dataset.idToDelete = id;
    new bootstrap.Modal(document.getElementById('confirmModal')).show();
};

window.editarAgendamento = async function(id) {
    try {
        const agendamentos = await carregarAgendamentos();
        const agendamento = agendamentos.find(a => a.id === id);
        
        if (agendamento) {
            entrarModoEdicao(agendamento);
        } else {
            mostrarAlerta('Erro!', 'Agendamento não encontrado', 'error');
        }
    } catch (error) {
        console.error('Erro ao editar agendamento:', error);
        mostrarAlerta('Erro!', 'Não foi possível carregar o agendamento para edição', 'error');
    }
};

// ========== PWA INSTALL PROMPT ========== //
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  const installBtn = document.createElement('button');
  installBtn.textContent = 'Instalar App';
  installBtn.className = 'btn btn-primary';
  installBtn.addEventListener('click', () => {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('Usuário aceitou a instalação');
      }
      deferredPrompt = null;
    });
  });
  document.body.appendChild(installBtn);
});