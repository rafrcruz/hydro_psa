import { createContext, useState, useContext } from 'react';

const ProfileContext = createContext();

export const profiles = {
  SOLICITANTE: 'Solicitante',
  EXECUTOR: 'Executor',
  AUTOMACAO: 'Automação',
  GESTAO: 'Gestão',
};

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(profiles.SOLICITANTE);

  return (
    <ProfileContext.Provider value={{ profile, setProfile, profiles: Object.values(profiles) }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
