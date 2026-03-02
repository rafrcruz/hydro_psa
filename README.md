# Hydro PSA

Aplicacao de demonstracao para o cliente Hydro.

## Objetivo

Este projeto simula um **Portal de Solicitacoes da Automacao (PSA)** com experiencia de service desk:
- abertura de chamados;
- fila de atendimento;
- acompanhamento de status;
- painel de automacao e visao gerencial.

## Arquitetura da demo

- Stack: React + Vite + Tailwind.
- Somente frontend (sem backend real).
- Persistencia local em IndexedDB com `Dexie`.
- Seed inicial automatico:
  - se o banco local estiver vazio, dados mock sao inseridos;
  - se ja existir banco no navegador, os dados existentes sao reutilizados.

Isso gera comportamento de prototipo de alta fidelidade sem servidor.

## Como rodar

```bash
npm install
npm run dev
```

Build de producao:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

## Estrutura principal

- `src/data/`: schema e seed da base mock local.
- `src/services/mockApi.js`: camada assincrona que simula API.
- `src/pages/`: telas por perfil (solicitante, executor, automacao, gestao).
- `src/router/`: rotas e controle de acesso por perfil.
