import { BrowserRouter as Router } from 'react-router-dom';
import { ProfileProvider } from './contexts/ProfileContext';
import AppRoutes from './router/AppRoutes';

function App() {
  return (
    <ProfileProvider>
      <Router>
        <AppRoutes />
      </Router>
    </ProfileProvider>
  );
}

export default App;
