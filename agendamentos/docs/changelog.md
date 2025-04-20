# Changelog - Cantinho do Pet

Todos os principais cambios no projeto serão documentados neste arquivo.

## [1.0.1] - 2023-11-20

### Corrigido
- Função de exclusão de agendamentos que não estava funcionando corretamente
- Conflitos entre as funções de edição e exclusão
- Validação de formulários para evitar relatórios em branco

### Adicionado
- Função completa de edição de agendamentos
- Novos botões de ação (Editar/Cancelar)
- Verificação de dados antes de gerar relatórios PDF
- Feedback visual melhorado para o usuário

## [1.0.0] - 2023-11-15

### Adicionado
- Sistema completo de agendamentos
- Integração com FullCalendar
- Armazenamento local com LocalForage
- Geração de relatórios em PDF
- Design responsivo
- PWA (Progressive Web App) básico
- Validação de formulários
- Modal de confirmação para exclusões

## [0.9.0] - 2023-11-10

### Adicionado
- Estrutura inicial do projeto
- Página HTML básica
- Estilos CSS iniciais
- Configuração do service worker
- Manifest.json para PWA

---

## Notas de Versão

### Versão 1.0.1
Esta atualização corrigiu problemas críticos na exclusão de agendamentos e adicionou a tão esperada função de edição. O sistema agora:
- Permite editar agendamentos existentes de forma intuitiva
- Exibe confirmações antes de ações importantes
- Valida todos os campos obrigatórios
- Garante que os relatórios só sejam gerados com dados válidos

### Versão 1.0.0
Lançamento inicial com todas as funcionalidades básicas operacionais:
- Cadastro de novos agendamentos
- Visualização em calendário
- Listagem completa
- Geração de relatórios
- Funcionamento offline (PWA)

### Versão 0.9.0
Versão inicial de desenvolvimento com a estrutura básica do projeto.

---

## Próximas Atualizações

- [ ] Notificações para agendamentos próximos
- [ ] Suporte para múltiplos pets por cliente
- [ ] Integração com Google Calendar
- [ ] Sistema de login e perfis de usuário
- [ ] Upload de fotos dos pets

---

Este arquivo CHANGELOG.md segue o padrão [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).