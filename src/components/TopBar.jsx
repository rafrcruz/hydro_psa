import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext';
import { getDefaultRoute } from '../router/routeConfig';
import NotificationCenter from './NotificationCenter';

export default function TopBar() {
  const { profile, setProfile, profiles, currentUser } = useProfile();
  const navigate = useNavigate();

  const onProfileChange = (nextProfile) => {
    setProfile(nextProfile);
    const defaultRoute = getDefaultRoute(nextProfile);
    if (defaultRoute) {
      navigate(defaultRoute, { replace: true });
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-light-gray bg-white" role="banner">
      <div className="mx-auto flex h-24 w-[min(96vw,1760px)] items-center gap-5 px-3 sm:px-5 lg:px-7">
        <div className="flex items-center gap-5">
          <img
            src="/assets/brand/hydro/logos/secondary/hydro-logo-horizontal-blue.png"
            alt="Hydro"
            className="h-[4.375rem] w-auto"
          />
          <h1 className="text-3xl font-display leading-tight text-black">{'Portal de Solicita\u00e7\u00f5es da Automa\u00e7\u00e3o'}</h1>
        </div>

        <div className="ml-auto flex items-center gap-3 font-arial">
          <NotificationCenter profile={profile} currentUserId={currentUser.id} />

          <label htmlFor="profile-select" className="sr-only">Perfil</label>
          <select
            id="profile-select"
            value={profile}
            onChange={(event) => onProfileChange(event.target.value)}
            className="input min-w-[12rem] bg-white text-base text-mid-gray"
          >
            {profiles.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 rounded-lg border border-light-gray bg-white px-3 py-2">
            <User className="h-4 w-4 text-hydro-blue" />
            <div>
              <p className="text-sm font-semibold text-hydro-blue">{currentUser.name}</p>
              <p className="text-xs text-aluminium">{currentUser.role}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

