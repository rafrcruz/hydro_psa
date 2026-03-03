import { NavLink } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext';
import { routeConfig } from '../router/routeConfig';

function buildNavPath(path) {
  if (path.includes(':id')) {
    return path.replace(':id', 'CHD-0001');
  }
  return path;
}

export default function Sidebar() {
  const { profile } = useProfile();
  const menuItems = (routeConfig[profile] || []).filter((item) => item.menu !== false);

  return (
    <aside className="card h-fit p-3 font-arial" aria-label="Navegação">
      <p className="px-2 pb-2 pt-1 text-sm font-semibold uppercase tracking-[0.08em] text-aluminium">Menu</p>
      <nav className="space-y-1">
        {menuItems.map(({ path, title }) => (
          <NavLink
            key={path}
            to={buildNavPath(path)}
            className={({ isActive }) =>
              `block rounded-lg px-4 py-2.5 text-[1.05rem] transition-colors ${
                isActive
                  ? 'bg-hydro-blue text-white'
                  : 'text-hydro-blue hover:bg-light-gray'
              }`
            }
          >
            {title}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

