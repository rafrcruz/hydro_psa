import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext';
import { routeConfig } from './AppRoutes';
import TopBar from '../components/TopBar';
import Sidebar from '../components/Sidebar';
import Breadcrumbs from '../components/Breadcrumbs';
import PageContent from '../components/PageContent';

const AccessDenied = () => (
    <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-4xl font-bold text-red-500">Acesso Negado</h1>
        <p className="text-lg text-gray-600">Você não tem permissão para acessar esta página.</p>
    </div>
);

const Layout = () => {
    const { profile } = useProfile();
    const location = useLocation();

    const allowedRoutes = routeConfig[profile].map(r => r.path);
    
    const isPathAllowed = (path) => {
        return allowedRoutes.some(allowedPath => {
            const regex = new RegExp(`^${allowedPath.replace(/:\w+/g, '[^/]+')}$`);
            return regex.test(path);
        });
    };

    const canAccess = isPathAllowed(location.pathname);

    if (!canAccess && location.pathname !== '/') {
        // If the path is not allowed and it's not the root, show access denied.
        return <AccessDenied />;
    }
    
    if (location.pathname === '/') {
        // If it's the root, navigate to the first allowed path for the profile.
        return <Navigate to={allowedRoutes[0]} replace />;
    }

    return (
        <div className="flex h-screen bg-gray-100">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <TopBar />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-200 p-4">
                    <Breadcrumbs />
                    <PageContent>
                        <Outlet />
                    </PageContent>
                </main>
            </div>
        </div>
    );
};

export default Layout;
