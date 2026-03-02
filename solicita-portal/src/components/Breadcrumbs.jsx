import { useLocation, Link } from 'react-router-dom';
import { routeConfig } from '../router/AppRoutes';
import { useProfile } from '../contexts/ProfileContext';

const Breadcrumbs = () => {
  const location = useLocation();
  const { profile } = useProfile();
  
  const allRoutes = Object.values(routeConfig).flat();
  const currentRoute = allRoutes.find(route => {
    const routeParts = route.path.split('/').filter(p => p);
    const locationParts = location.pathname.split('/').filter(p => p);
    if (routeParts.length !== locationParts.length) return false;

    return routeParts.every((part, i) => part.startsWith(':') || part === locationParts[i]);
  });
  
  const crumbs = location.pathname.split('/').filter(crumb => crumb !== '');

  return (
    <nav className="text-sm mb-4" aria-label="Breadcrumb">
      <ol className="list-none p-0 inline-flex">
        <li className="flex items-center">
          <Link to="/" className="text-gray-500 hover:text-gray-700">Home</Link>
          {crumbs.length > 0 && <span className="mx-2">/</span>}
        </li>
        {crumbs.map((crumb, index) => {
          const path = `/${crumbs.slice(0, index + 1).join('/')}`;
          const isLast = index === crumbs.length - 1;
          
          let title = crumb.charAt(0).toUpperCase() + crumb.slice(1);
          if (isLast && currentRoute) {
            title = currentRoute.title.replace(/:\w+/, crumb);
          }

          return (
            <li key={path} className="flex items-center">
              {isLast ? (
                <span className="text-gray-800 font-semibold">{title}</span>
              ) : (
                <Link to={path} className="text-gray-500 hover:text-gray-700">{title}</Link>
              )}
              {!isLast && <span className="mx-2">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
