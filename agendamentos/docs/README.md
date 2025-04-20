# Cantinho do Pet - Agendamentos (PWA)

Aplicação web para agendamento de serviços em petshop e clínica veterinária, com funcionamento offline como Progressive Web App (PWA).

## 📄 Funcionalidades

- Calendário interativo (FullCalendar)
- Agendamento de serviços para pets (CRUD completo)
- Lista dinâmica de agendamentos
- Geração de relatórios em PDF (jsPDF)
- Notificações elegantes (SweetAlert2)
- Funcionamento offline com Service Worker
- Responsivo para todos os dispositivos

## 📊 Tecnologias Utilizadas

- HTML5, CSS3, JavaScript
- Bootstrap 5
- FullCalendar
- jsPDF + autoTable
- LocalForage
- SweetAlert2
- Font Awesome

## 🌐 Instalação e Uso Local

1. **Clone o repositório**

```bash
git clone https://github.com/seuusuario/cantinho-do-pet.git
cd cantinho-do-pet
```

2. **Abra no navegador (modo local)**

Você pode abrir o `index.html` diretamente no navegador, mas para testar o modo PWA corretamente:

```bash
npm install -g live-server
live-server
```

3. **Instale no dispositivo (PWA)**

- Acesse via navegador (Chrome/Edge no PC ou Android)
- Clique em "Instalar app" na barra de endereço
- O app funcionará offline após o primeiro carregamento

## 🔗 Estrutura do Projeto

```
cantinho-do-pet/
├── index.html
├── styles.css
├── app.js
├── relatorio.js
├── manifest.json
├── service-worker.js
├── /icons
│   ├── icon-192.png
│   └── icon-512.png
└── /docs
    └── README.md
```

## 🔧 Como Personalizar

- Altere o logotipo e as cores em `styles.css`
- Personalize os ícones dentro da pasta `/icons`
- Edite o `manifest.json` com nome, descrição e tema desejados

## ✅ To-do Futuro

- Integração com banco de dados (Firebase, Supabase, etc)
- Sistema de autenticação de usuários
- Notificações push reais

---

Feito com ❤️ para o **Cantinho do Pet**

> Desenvolvido para facilitar o dia a dia do seu petshop!
