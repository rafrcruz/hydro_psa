import { Link, useLocation } from 'react-router-dom';
import { routeConfig } from '../router/routeConfig';

export default function Breadcrumbs() {
  const location = useLocation();
  const allRoutes = Object.values(routeConfig).flat();
  const crumbs = location.pathname.split('/').filter(Boolean);

  const currentRoute = allRoutes.find((route) => {
    const routeParts = route.path.split('/').filter(Boolean);
    if (routeParts.length !== crumbs.length) {
      return false;
    }
    return routeParts.every((part, index) => part.startsWith(':') || part === crumbs[index]);
  });

  return (
    <nav className="text-sm text-mid-gray" aria-label="Breadcrumb">
      <ol className="flex items-center gap-2">
        <li>
          <Link to="/" className="hover:text-hydro-blue">Home</Link>
        </li>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          const path = `/${crumbs.slice(0, index + 1).join('/')}`;
          const label = isLast && currentRoute ? currentRoute.title : crumb;

          return (
            <li key={path} className="flex items-center gap-2">
              <span>/</span>
              {isLast ? (
                <span className="font-semibold text-hydro-blue">{label}</span>
              ) : (
                <Link to={path} className="hover:text-hydro-blue">{label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
