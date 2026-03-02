import { NavLink } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext';
import { routeConfig } from '../router/AppRoutes';
import { cn } from '../lib/utils';

const Sidebar = () => {
  const { profile } = useProfile();
  const menuItems = routeConfig[profile] || [];

  return (
    <aside className="w-64 bg-gray-800 text-white flex flex-col">
      <div className="h-16 flex items-center justify-center font-bold text-xl border-b border-gray-700">
        <span>Hydro</span>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-2">
        {menuItems.map(({ path, title }) => (
          <NavLink
            key={path}
            to={path.includes(':id') ? path.replace(':id', '1') : path} // Dummy ID for navigation
            className={({ isActive }) =>
              cn(
                'flex items-center px-4 py-2 rounded-md text-sm font-medium',
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              )
            }
          >
            {title}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
