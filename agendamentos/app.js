/**
 * app.js - Sistema de Agendamentos Cantinho do Pet
 * Versão com modo claro/escuro
 * Últimas atualizações:
 * - Adição de tema claro/escuro
 * - Persistência de preferência de tema
 * - Integração com preferência do sistema
 * - Melhorias na organização do código
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
    configurarTema(); // Nova função para configurar tema
    await atualizarInterface();
});

// Configuração do tema claro/escuro
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

// Inicializa o calendário FullCalendar
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
        }
    });
    calendar.render();
}

// Configura o formulário de agendamento
function configurarFormulario() {
    const form = document.getElementById('form-agendamento');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!validarFormulario()) {
            mostrarAlerta('Atenção!', 'Por favor, preencha todos os campos obrigatórios', 'warning');
            return;
        }
        
        // Coletar todos os serviços e valores
        const servicos = Array.from(document.querySelectorAll('.servico-input'))
            .map(input => input.value)
            .filter(val => val);
            
        const valoresServicos = Array.from(document.querySelectorAll('.valor-servico'))
            .map(input => parseFloat(input.value))
            .filter(val => !isNaN(val));

        if (servicos.length === 0) {
            mostrarAlerta('Atenção!', 'Por favor, adicione pelo menos um serviço', 'warning');
            return;
        }

        const agendamento = {
            id: editMode ? currentEditId : Date.now(),
            nome: document.getElementById('nomeCliente').value,
            servicos: servicos,
            valoresServicos: valoresServicos,
            data: document.getElementById('data').value,
            hora: document.getElementById('horario').value,
            valor: parseFloat(document.getElementById('valor').value),
            observacoes: document.getElementById('observacoes').value,
            dataCriacao: new Date().toISOString()
        };

        try {
            if (editMode) {
                await atualizarAgendamento(agendamento);
            } else {
                await salvarAgendamento(agendamento);
            }
            
            mostrarAlerta('Sucesso!', 'Agendamento confirmado com sucesso', 'success');
            await atualizarInterface();
            form.reset();
            sairModoEdicao();
            
            // Mostrar comprovante após salvar
            mostrarComprovante(agendamento);
            
        } catch (error) {
            console.error('Erro no formulário:', error);
            if (error.message.includes('horário')) {
                mostrarAlerta('Erro!', error.message, 'error');
            }
        }
    });
}

// Configura eventos de UI
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

// Configura múltiplos serviços com valores editáveis
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

    // Configura eventos para os serviços
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

// Atualiza o estado dos botões de remover serviço
function atualizarBotoesRemover() {
    const botoes = document.querySelectorAll('.remove-servico');
    botoes.forEach((btn, index) => {
        btn.disabled = index === 0;
    });
}

// Calcula o valor total baseado nos serviços
function calcularValorTotal() {
    const servicosInputs = Array.from(document.querySelectorAll('.servico-input'));
    const valoresInputs = Array.from(document.querySelectorAll('.valor-servico'));
    
    let total = 0;
    servicosInputs.forEach((input, index) => {
        if (input.value && valoresInputs[index].value) {
            total += parseFloat(valoresInputs[index].value) || 0;
        }
    });
    
    document.getElementById('valor').value = total.toFixed(2);
}

// Funções de CRUD
async function carregarAgendamentos() {
    try {
        const dados = await localforage.getItem('agendamentos');
        return dados ? dados : [];
    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
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
        
        // Verifica se já existe um agendamento com mesmo horário
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
        
        if (index !== -1) {
            agendamentos[index] = agendamentoAtualizado;
            await localforage.setItem('agendamentos', agendamentos);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Erro ao atualizar agendamento:', error);
        throw error;
    }
}

async function excluirAgendamento(id) {
    try {
        let agendamentos = await carregarAgendamentos();
        agendamentos = agendamentos.filter(a => a.id !== id);
        await localforage.setItem('agendamentos', agendamentos);
        return true;
    } catch (error) {
        console.error('Erro ao excluir agendamento:', error);
        throw error;
    }
}

// Atualiza a interface do usuário
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

// Cria um item da lista de agendamentos
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

// Formata data para exibição
function formatarData(dataString) {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dataString).toLocaleDateString('pt-BR', options);
}

// Valida o formulário
function validarFormulario() {
    const camposObrigatorios = [
        'nomeCliente',
        'data',
        'horario',
        'valor'
    ];

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
        .map(input => input.value)
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

// Mostra alerta usando SweetAlert2
function mostrarAlerta(titulo, mensagem, tipo) {
    Swal.fire({
        title: titulo,
        text: mensagem,
        icon: tipo,
        confirmButtonColor: '#6a11cb'
    });
}

// Funções de comprovante
function mostrarComprovante(agendamento) {
    const comprovanteModal = new bootstrap.Modal(document.getElementById('comprovanteModal'));
    document.getElementById('comprovante-content').innerHTML = gerarComprovante(agendamento);
    agendamentoAtual = agendamento;
    comprovanteModal.show();
}

function gerarComprovante(agendamento) {
    const servicosList = agendamento.servicos.map((s, i) => {
        const valor = agendamento.valoresServicos?.[i] || 0;
        return `<li>${s} - R$ ${valor.toFixed(2)}</li>`;
    }).join('');
    
    return `
        <div class="comprovante">
            <div class="text-center mb-4">
                <img src="/assets/logo/WhatsApp Image 2025-04-18 at 15.16.34.jpeg" alt="Logo Cantinho do Pet" width="80" class="mb-2">
                <h4 class="text-success">Cantinho do Pet</h4>
                <h5 class="mb-3" style="color: var(--secondary-color);">COMPROVANTE DE AGENDAMENTO</h5>
            </div>
            
            <div class="mb-3">
                <h6>Informações do Cliente:</h6>
                <p><strong>Nome:</strong> ${agendamento.nome}</p>
                <p><strong>Data do Agendamento:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
            </div>
            
            <div class="mb-3">
                <h6>Detalhes do Agendamento:</h6>
                <p><strong>Data:</strong> ${formatarData(agendamento.data)}</p>
                <p><strong>Horário:</strong> ${agendamento.hora}</p>
                <p><strong>Serviços:</strong></p>
                <ul>${servicosList}</ul>
                <p><strong>Valor Total:</strong> R$ ${agendamento.valor.toFixed(2)}</p>
                ${agendamento.observacoes ? `<p><strong>Observações:</strong> ${agendamento.observacoes}</p>` : ''}
            </div>
            
            <div class="alert alert-light mt-4">
                <small>Este comprovante foi gerado automaticamente pelo sistema Cantinho do Pet.</small>
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
    
    const texto = `✅ *AGENDAMENTO CONFIRMADO - CANTINHO DO PET* ✅%0A%0A` +
                  `🐾 *Cliente:* ${agendamento.nome}%0A` +
                  `📅 *Data:* ${formatarData(agendamento.data)}%0A` +
                  `⏰ *Horário:* ${agendamento.hora}%0A` +
                  `💼 *Serviços:*%0A${servicosText}%0A` +
                  `💰 *Valor Total:* R$ ${agendamento.valor.toFixed(2)}${observacoesText}%0A%0A` +
                  `_Agradecemos pela preferência! 🐶😸_`;
    
    window.open(`https://wa.me/?text=${texto}`, '_blank');
}

// Funções de modo de edição
function entrarModoEdicao(agendamento) {
    editMode = true;
    currentEditId = agendamento.id;
    agendamentoAtual = agendamento;
    
    document.getElementById('nomeCliente').value = agendamento.nome;
    document.getElementById('data').value = agendamento.data;
    document.getElementById('horario').value = agendamento.hora;
    document.getElementById('valor').value = agendamento.valor.toFixed(2);
    document.getElementById('observacoes').value = agendamento.observacoes || '';
    
    // Preencher serviços com valores
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
    
    // Configurar eventos para os novos inputs
    servicosContainer.addEventListener('input', function(e) {
        if (e.target.classList.contains('servico-input') || e.target.classList.contains('valor-servico')) {
            calcularValorTotal();
        }
    });
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
    
    // Reconfigurar eventos
    servicosContainer.addEventListener('input', function(e) {
        if (e.target.classList.contains('servico-input') || e.target.classList.contains('valor-servico')) {
            calcularValorTotal();
        }
    });
}

// Funções globais
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

// Instalação PWA
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // Mostrar botão de instalação (opcional)
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