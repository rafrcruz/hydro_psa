# Portal de Solicitações - Protótipo

Este é um protótipo de frontend para um "Portal de Solicitações", desenvolvido com React, Vite e Tailwind CSS.

## Funcionalidades

- **Build e Dev Server:** Projeto configurado com Vite para um ambiente de desenvolvimento rápido.
- **Estilização com Tailwind CSS:** Layout responsivo e estilizado com Tailwind CSS.
- **Roteamento com React Router:** Navegação entre diferentes seções do portal.
- **Simulação de Perfis:** Permite alternar entre diferentes perfis de usuário (Solicitante, Executor, Automação, Gestão) para simular permissões e menus.
- **Estrutura Organizada:** O código-fonte é organizado em pastas para páginas, componentes, contextos, etc.

## Como Rodar o Projeto

1. **Clone o repositório:**
   ```bash
   git clone <url-do-repositorio>
   cd solicita-portal
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

   O projeto estará disponível em `http://localhost:5173`.

## Estrutura do Projeto

A estrutura de pastas principal é a seguinte:

```
solicita-portal/
├── public/
└── src/
    ├── assets/
    ├── components/
    │   ├── Breadcrumbs.jsx
    │   ├── PageContent.jsx
    │   ├── Sidebar.jsx
    │   └── TopBar.jsx
    ├── contexts/
    │   └── ProfileContext.jsx
    ├── lib/
    │   └── utils.js
    ├── router/
    │   ├── AppRoutes.jsx
    │   └── Layout.jsx
    ├── App.jsx
    ├── index.css
    └── main.jsx
```

- **`src/components`**: Contém os componentes reutilizáveis da aplicação.
- **`src/contexts`**: Armazena os contextos do React, como o `ProfileContext` para gerenciamento de perfil.
- **`src/lib`**: Utilitários e funções auxiliares.
- **`src/router`**: Configuração de rotas e o layout principal da aplicação.

## Trocando o Perfil de Usuário

Para simular a visualização de diferentes perfis de usuário, utilize o seletor localizado no canto superior direito do `TopBar`. Ao selecionar um novo perfil, o menu lateral e o acesso às páginas serão atualizados automaticamente de acordo com as permissões definidas no arquivo `src/router/AppRoutes.jsx`.
