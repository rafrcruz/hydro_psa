import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useProfile } from '../contexts/ProfileContext';
import { routeConfig } from './routeConfig';
import TopBar from '../components/TopBar';
import Sidebar from '../components/Sidebar';
import Breadcrumbs from '../components/Breadcrumbs';
import PageContent from '../components/PageContent';
import Footer from '../components/Footer';
import { bootstrapMockApi } from '../services/mockApi';

export default function Layout() {
  const { profile } = useProfile();
  const location = useLocation();

  useEffect(() => {
    bootstrapMockApi();
  }, []);

  const allowedRoutes = routeConfig[profile].map((route) => route.path);

  const canAccess = allowedRoutes.some((routePath) => {
    const regex = new RegExp(`^${routePath.replace(/:\\w+/g, '[^/]+')}$`);
    return regex.test(location.pathname);
  });

  if (location.pathname === '/' || !canAccess) {
    return <Navigate to={allowedRoutes[0]} replace />;
  }

  return (
    <div className="min-h-screen bg-light-gray">
      <TopBar />
      <main className="mx-auto w-[min(96vw,1760px)] space-y-5 px-3 py-6 sm:px-5 lg:px-7">
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <Sidebar />
          <section className="space-y-4">
            <Breadcrumbs />
            <PageContent>
              <Outlet />
            </PageContent>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
