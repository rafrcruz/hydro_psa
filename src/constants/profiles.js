export const profiles = {
  SOLICITANTE: 'Solicitante',
  EXECUTOR: 'Executor',
  AUTOMACAO: 'Automação',
  GESTAO: 'Gestão',
};

export const profileUsers = {
  [profiles.SOLICITANTE]: {
    id: 'usr-ana',
    name: 'Ana Martins',
    role: 'Solicitante',
  },
  [profiles.EXECUTOR]: {
    id: 'usr-carlos',
    name: 'Carlos Souza',
    role: 'Executor',
  },
  [profiles.AUTOMACAO]: {
    id: 'usr-livia',
    name: 'Lívia Rocha',
    role: 'Automação',
  },
  [profiles.GESTAO]: {
    id: 'usr-marcos',
    name: 'Marcos Lima',
    role: 'Gestão',
  },
};
