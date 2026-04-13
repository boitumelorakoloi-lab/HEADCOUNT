import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { AuthProvider }         from './contexts/AuthContext';
import { DataProvider }         from './contexts/DataContext';
import { LogProvider }          from './contexts/LogContext';
import { ThemeProvider }        from './contexts/ThemeContext';
import { ClassSessionProvider } from './contexts/ClassSessionContext';
import { Toaster }              from './components/ui/sonner';
import { LoadingPage }          from './components/LoadingPage';
import { routes }               from './routes';
import { useData }              from './contexts/DataContext';
import { useAuth }              from './contexts/AuthContext';

function LoadingGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { loading }         = useData();

  if (isAuthenticated && loading) return <LoadingPage />;
  return <>{children}</>;
}

function Root() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LogProvider>
          <DataProvider>
            <ClassSessionProvider>
              <LoadingGate>
                <Outlet />
              </LoadingGate>
              <Toaster />
            </ClassSessionProvider>
          </DataProvider>
        </LogProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

const router = createBrowserRouter([
  {
    element: <Root />,
    children: routes,
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}