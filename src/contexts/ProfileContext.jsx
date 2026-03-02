import { createContext, useContext, useMemo, useState } from 'react';
import { profileUsers, profiles } from '../constants/profiles';

const PROFILE_STORAGE_KEY = 'hydro_psa_active_profile';

const ProfileContext = createContext(null);

function getInitialProfile() {
  const savedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
  if (savedProfile && Object.values(profiles).includes(savedProfile)) {
    return savedProfile;
  }
  return profiles.SOLICITANTE;
}

export function ProfileProvider({ children }) {
  const [profile, setProfileState] = useState(getInitialProfile);

  const setProfile = (nextProfile) => {
    setProfileState(nextProfile);
    localStorage.setItem(PROFILE_STORAGE_KEY, nextProfile);
  };

  const value = useMemo(
    () => ({
      profile,
      setProfile,
      profiles: Object.values(profiles),
      currentUser: profileUsers[profile],
    }),
    [profile],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used inside ProfileProvider');
  }
  return context;
}
