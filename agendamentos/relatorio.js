/**
 * relatorio.js - Geração de Relatórios PDF para Cantinho do Pet
 * Versão corrigida e atualizada
 * 
 * Correções implementadas:
 * - Corrigido problema de geração de relatório
 * - Adicionados todos os campos do agendamento
 * - Melhor formatação dos dados
 * - Validação de dados antes da geração
 */

// Configurações do relatório
const RELATORIO_CONFIG = {
    titulo: "Relatório de Agendamentos - Cantinho do Pet",
    cabecalho: {
        margem: 15,
        corPrimaria: [106, 17, 203], // Roxo
        corSecundaria: [0, 0, 0]     // Preto
    },
    tabela: {
        margem: 15,
        cores: {
            cabecalho: [106, 17, 203],
            textoCabecalho: [255, 255, 255],
            linhaAlternada: [248, 249, 250]
        }
    },
    fontes: {
        titulo: { estilo: 'Montserrat', peso: 'bold' },
        corpo: { estilo: 'Poppins', peso: 'normal' }
    }
};

/**
 * Função principal para gerar relatório PDF
 * @async
 */
async function gerarRelatorioPDF() {
    try {
        console.log('Iniciando geração de relatório...');
        const agendamentos = await carregarAgendamentosFormatados();
        
        if (!agendamentos || agendamentos.length === 0) {
            await mostrarAlertaSemDados();
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        console.log('Configurando documento PDF...');
        await gerarCabecalho(doc, agendamentos);
        await gerarCorpo(doc, agendamentos);
        await gerarRodape(doc);

        console.log('Salvando documento...');
        const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        doc.save(`relatorio-cantinho-pet-${dataAtual}.pdf`);
        console.log('Relatório gerado com sucesso!');

    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        await mostrarAlertaErro();
    }
}

/**
 * Carrega e formata os agendamentos para o relatório
 * @returns {Promise<Array>} Agendamentos formatados
 */
async function carregarAgendamentosFormatados() {
    try {
        console.log('Carregando agendamentos...');
        const agendamentos = await localforage.getItem('agendamentos') || [];
        
        return agendamentos.map(ag => ({
            ...ag,
            dataFormatada: formatarData(ag.data),
            valorBaseFormatado: (ag.valorBase || 0).toFixed(2),
            valorFormatado: ag.valor.toFixed(2),
            servicosFormatados: formatarServicosParaRelatorio(ag.servicos, ag.valoresServicos || []),
            petFormatado: formatarPetParaRelatorio(ag.pet),
            tipoServicoFormatado: formatarTipoServico(ag.tipoServico),
            porteFormatado: formatarPorte(ag.portePet)
        }));
    } catch (error) {
        console.error('Erro ao formatar agendamentos:', error);
        return [];
    }
}

/**
 * Formata os dados do pet para o relatório
 * @param {Object} pet - Objeto com informações do pet
 * @returns {string} Texto formatado
 */
function formatarPetParaRelatorio(pet) {
    let infoPet = `${pet.nome} (${pet.tipo})`;
    if (pet.raca) infoPet += `, ${pet.raca}`;
    infoPet += `, ${pet.peso}kg`;
    return infoPet;
}

/**
 * Formata o tipo de serviço para exibição
 * @param {string} tipoServico - Tipo do serviço
 * @returns {string} Texto formatado
 */
function formatarTipoServico(tipoServico) {
    const tipos = {
        'banho': 'Banho',
        'tosa': 'Tosa',
        'banho-tosa': 'Banho + Tosa',
        'vacinacao': 'Vacinação',
        'consulta': 'Consulta',
        'outro': 'Outro'
    };
    return tipos[tipoServico] || tipoServico;
}

/**
 * Formata o porte do pet para exibição
 * @param {string} porte - Porte do pet
 * @returns {string} Texto formatado
 */
function formatarPorte(porte) {
    const portes = {
        'pequeno': 'Pequeno',
        'medio': 'Médio',
        'grande': 'Grande'
    };
    return portes[porte] || porte;
}

/**
 * Formata a data para exibição (DD/MM/AAAA)
 * @param {string} dataString - Data em formato ISO
 * @returns {string} Data formatada
 */
function formatarData(dataString) {
    try {
        const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
        return new Date(dataString).toLocaleDateString('pt-BR', options);
    } catch (error) {
        console.error('Erro ao formatar data:', error);
        return dataString; // Retorna o original em caso de erro
    }
}

/**
 * Formata a lista de serviços com valores para o relatório
 * @param {Array} servicos - Lista de serviços
 * @param {Array} valores - Valores correspondentes
 * @returns {string} Texto formatado
 */
function formatarServicosParaRelatorio(servicos, valores) {
    return servicos.map((servico, index) => {
        const valor = valores[index] ? ` (R$ ${parseFloat(valores[index]).toFixed(2)})` : '';
        return `• ${servico}${valor}`;
    }).join('\n');
}

/**
 * Calcula totais e estatísticas dos agendamentos
 * @param {Array} agendamentos - Lista de agendamentos
 * @returns {Object} Objeto com totais e contagem
 */
function calcularTotais(agendamentos) {
    try {
        const totalAgendamentos = agendamentos.length;
        const totalValor = agendamentos.reduce((sum, a) => sum + parseFloat(a.valor), 0);
        const totalValorBase = agendamentos.reduce((sum, a) => sum + parseFloat(a.valorBase || 0), 0);
        const servicosCount = contarServicos(agendamentos);
        const petsCount = contarPets(agendamentos);
        const tiposServicoCount = contarTiposServico(agendamentos);
        
        return {
            totalAgendamentos,
            totalValor,
            totalValorBase,
            servicosCount,
            petsCount,
            tiposServicoCount
        };
    } catch (error) {
        console.error('Erro ao calcular totais:', error);
        return {
            totalAgendamentos: 0,
            totalValor: 0,
            totalValorBase: 0,
            servicosCount: {},
            petsCount: {},
            tiposServicoCount: {}
        };
    }
}

/**
 * Conta a ocorrência de cada tipo de pet
 * @param {Array} agendamentos - Lista de agendamentos
 * @returns {Object} Contagem de tipos de pets
 */
function contarPets(agendamentos) {
    const contagem = {};
    
    agendamentos.forEach(agendamento => {
        const tipo = agendamento.pet.tipo;
        contagem[tipo] = (contagem[tipo] || 0) + 1;
    });
    
    return Object.entries(contagem).sort((a, b) => b[1] - a[1]).reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
    }, {});
}

/**
 * Conta a ocorrência de cada tipo de serviço principal
 * @param {Array} agendamentos - Lista de agendamentos
 * @returns {Object} Contagem de tipos de serviço
 */
function contarTiposServico(agendamentos) {
    const contagem = {};
    
    agendamentos.forEach(agendamento => {
        const tipo = formatarTipoServico(agendamento.tipoServico);
        contagem[tipo] = (contagem[tipo] || 0) + 1;
    });
    
    return Object.entries(contagem).sort((a, b) => b[1] - a[1]).reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
    }, {});
}

/**
 * Conta a ocorrência de cada serviço com valores
 * @param {Array} agendamentos - Lista de agendamentos
 * @returns {Object} Contagem de serviços
 */
function contarServicos(agendamentos) {
    const contagem = {};
    
    agendamentos.forEach(agendamento => {
        agendamento.servicos.forEach((servico, index) => {
            const valor = agendamento.valoresServicos?.[index] || 0;
            const chave = `${servico} (R$ ${valor.toFixed(2)})`;
            contagem[chave] = (contagem[chave] || 0) + 1;
        });
    });
    
    return Object.entries(contagem).sort((a, b) => b[1] - a[1]).reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
    }, {});
}

/**
 * Obtém o período coberto pelo relatório
 * @param {Array} agendamentos - Lista de agendamentos
 * @returns {string} Período formatado
 */
function getPeriodoRelatorio(agendamentos) {
    if (agendamentos.length === 0) return 'Nenhum agendamento';
    
    try {
        const datas = agendamentos.map(a => new Date(a.data));
        const maisAntiga = new Date(Math.min(...datas));
        const maisRecente = new Date(Math.max(...datas));
        
        return `${formatarData(maisAntiga)} a ${formatarData(maisRecente)}`;
    } catch (error) {
        console.error('Erro ao calcular período:', error);
        return 'Período não disponível';
    }
}

/**
 * Gera o cabeçalho do relatório
 * @param {jsPDF} doc - Documento PDF
 * @param {Array} agendamentos - Lista de agendamentos
 */
async function gerarCabecalho(doc, agendamentos) {
    const { titulo, cabecalho, fontes } = RELATORIO_CONFIG;
    
    try {
        // Título principal
        doc.setFont(fontes.titulo.estilo, fontes.titulo.peso);
        doc.setFontSize(18);
        doc.setTextColor(...cabecalho.corPrimaria);
        doc.text(titulo, cabecalho.margem, 20);
        
        // Informações do período
        doc.setFont(fontes.corpo.estilo, fontes.corpo.peso);
        doc.setFontSize(11);
        doc.setTextColor(...cabecalho.corSecundaria);
        
        doc.text(`Período: ${getPeriodoRelatorio(agendamentos)}`, cabecalho.margem, 30);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, cabecalho.margem, 35);
        
        // Linha divisória
        doc.setDrawColor(...cabecalho.corPrimaria);
        doc.setLineWidth(0.5);
        doc.line(cabecalho.margem, 40, doc.internal.pageSize.getWidth() - cabecalho.margem, 40);
    } catch (error) {
        console.error('Erro ao gerar cabeçalho:', error);
    }
}

/**
 * Gera o corpo principal do relatório
 * @param {jsPDF} doc - Documento PDF
 * @param {Array} agendamentos - Lista de agendamentos
 */
async function gerarCorpo(doc, agendamentos) {
    const { tabela, fontes } = RELATORIO_CONFIG;
    const totais = calcularTotais(agendamentos);
    
    try {
        // Configuração das colunas
        const columns = [
            { title: "Cliente", dataKey: "nome" },
            { title: "Pet", dataKey: "petFormatado" },
            { title: "Serviço", dataKey: "tipoServicoFormatado" },
            { title: "Porte", dataKey: "porteFormatado" },
            { title: "Data", dataKey: "dataFormatada" },
            { title: "Horário", dataKey: "hora" },
            { 
                title: "Serviços Adicionais", 
                dataKey: "servicosFormatados",
                cellStyle: { fontStyle: 'normal', fontSize: 9 }
            },
            { title: "Valor Base", dataKey: "valorBaseFormatado" },
            { title: "Total", dataKey: "valorFormatado" }
        ];
        
        // Opções da tabela
        const options = {
            startY: 45,
            margin: { left: tabela.margem },
            headStyles: {
                fillColor: tabela.cores.cabecalho,
                textColor: tabela.cores.textoCabecalho,
                fontStyle: 'bold',
                fontSize: 10,
                font: fontes.titulo.estilo
            },
            alternateRowStyles: {
                fillColor: tabela.cores.linhaAlternada
            },
            columnStyles: {
                nome: { cellWidth: 25, font: fontes.corpo.estilo },
                petFormatado: { cellWidth: 30, font: fontes.corpo.estilo, fontSize: 9 },
                tipoServicoFormatado: { cellWidth: 20, font: fontes.corpo.estilo },
                porteFormatado: { cellWidth: 15, font: fontes.corpo.estilo },
                dataFormatada: { cellWidth: 20, font: fontes.corpo.estilo },
                hora: { cellWidth: 15, font: fontes.corpo.estilo },
                servicosFormatados: { cellWidth: 50, font: fontes.corpo.estilo },
                valorBaseFormatado: { cellWidth: 20, font: fontes.corpo.estilo },
                valorFormatado: { cellWidth: 20, font: fontes.corpo.estilo }
            },
            didDrawPage: function(data) {
                adicionarTotaisAposTabela(doc, data, totais, tabela, fontes);
            }
        };
        
        // Gerar a tabela
        doc.autoTable(columns, agendamentos, options);
    } catch (error) {
        console.error('Erro ao gerar corpo do relatório:', error);
        doc.text('Ocorreu um erro ao gerar o relatório.', tabela.margem, 45);
    }
}

/**
 * Adiciona a seção de totais após a tabela
 * @param {jsPDF} doc - Documento PDF
 * @param {Object} data - Dados da tabela
 * @param {Object} totais - Totais calculados
 * @param {Object} tabelaConfig - Configurações da tabela
 * @param {Object} fontesConfig - Configurações de fonte
 */
function adicionarTotaisAposTabela(doc, data, totais, tabelaConfig, fontesConfig) {
    try {
        if (data.pageNumber === data.pageCount) {
            const finalY = data.cursor.y + 10;
            
            doc.setFont(fontesConfig.titulo.estilo, fontesConfig.titulo.peso);
            doc.setFontSize(12);
            doc.setTextColor(...RELATORIO_CONFIG.cabecalho.corPrimaria);
            
            doc.text(`Total de Agendamentos: ${totais.totalAgendamentos}`, tabelaConfig.margem, finalY);
            doc.text(`Valor Base Total: R$ ${totais.totalValorBase.toFixed(2)}`, tabelaConfig.margem, finalY + 7);
            doc.text(`Valor Total: R$ ${totais.totalValor.toFixed(2)}`, tabelaConfig.margem, finalY + 14);
            
            // Serviços mais solicitados
            doc.text('Serviços Principais:', tabelaConfig.margem, finalY + 28);
            
            doc.setFont(fontesConfig.corpo.estilo, fontesConfig.corpo.peso);
            doc.setFontSize(10);
            
            let yOffset = finalY + 35;
            Object.entries(totais.tiposServicoCount).forEach(([servico, count]) => {
                doc.text(`- ${servico}: ${count}x`, tabelaConfig.margem + 5, yOffset);
                yOffset += 5;
            });
            
            // Serviços adicionais mais solicitados
            doc.setFont(fontesConfig.titulo.estilo, fontesConfig.titulo.peso);
            doc.setFontSize(12);
            doc.text('Serviços Adicionais:', tabelaConfig.margem, yOffset + 10);
            
            doc.setFont(fontesConfig.corpo.estilo, fontesConfig.corpo.peso);
            doc.setFontSize(10);
            
            yOffset += 17;
            Object.entries(totais.servicosCount).slice(0, 5).forEach(([servico, count]) => {
                doc.text(`- ${servico}: ${count}x`, tabelaConfig.margem + 5, yOffset);
                yOffset += 5;
            });
            
            // Tipos de pets atendidos
            doc.setFont(fontesConfig.titulo.estilo, fontesConfig.titulo.peso);
            doc.setFontSize(12);
            doc.text('Tipos de Pets Atendidos:', tabelaConfig.margem, yOffset + 10);
            
            doc.setFont(fontesConfig.corpo.estilo, fontesConfig.corpo.peso);
            doc.setFontSize(10);
            
            yOffset += 17;
            Object.entries(totais.petsCount).forEach(([tipo, count]) => {
                doc.text(`- ${tipo}: ${count}x`, tabelaConfig.margem + 5, yOffset);
                yOffset += 5;
            });
        }
    } catch (error) {
        console.error('Erro ao adicionar totais:', error);
    }
}

/**
 * Gera o rodapé do relatório
 * @param {jsPDF} doc - Documento PDF
 */
async function gerarRodape(doc) {
    try {
        doc.setFont(RELATORIO_CONFIG.fontes.corpo.estilo, RELATORIO_CONFIG.fontes.corpo.peso);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        
        doc.text(
            "Relatório gerado automaticamente pelo sistema Cantinho do Pet",
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
        );
    } catch (error) {
        console.error('Erro ao gerar rodapé:', error);
    }
}

/**
 * Mostra alerta quando não há dados
 * @returns {Promise} Resultado do SweetAlert
 */
async function mostrarAlertaSemDados() {
    return await Swal.fire({
        icon: 'warning',
        title: 'Atenção!',
        text: 'Não há agendamentos para gerar o relatório',
        confirmButtonColor: RELATORIO_CONFIG.cabecalho.corPrimaria
    });
}

/**
 * Mostra alerta de erro na geração
 * @returns {Promise} Resultado do SweetAlert
 */
async function mostrarAlertaErro() {
    return await Swal.fire({
        icon: 'error',
        title: 'Erro!',
        text: 'Não foi possível gerar o relatório. Por favor, tente novamente.',
        confirmButtonColor: RELATORIO_CONFIG.cabecalho.corPrimaria
    });
}

// Exporta a função principal para uso global
window.gerarRelatorioPDF = gerarRelatorioPDF;