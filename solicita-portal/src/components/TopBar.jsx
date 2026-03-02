import { useProfile } from '../contexts/ProfileContext';
import { Bell, User } from 'lucide-react';

const TopBar = () => {
  const { profile, setProfile, profiles } = useProfile();

  return (
    <header className="flex items-center justify-between h-16 bg-white border-b border-gray-200 px-4">
      <div className="flex items-center">
        <h1 className="text-xl font-bold">Portal de Solicitações</h1>
      </div>
      <div className="flex items-center space-x-4">
        <div className="relative">
          <select
            id="profile"
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            {profiles.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <button className="p-2 rounded-full hover:bg-gray-200">
          <Bell className="h-6 w-6 text-gray-600" />
        </button>
        <button className="p-2 rounded-full hover:bg-gray-200">
          <User className="h-6 w-6 text-gray-600" />
        </button>
      </div>
    </header>
  );
};

export default TopBar;
