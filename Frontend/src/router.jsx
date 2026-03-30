import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import UserLayout from './layouts/UserLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages - Public
import Home from './pages/Public/Home';
import Login from './pages/Public/Login';

// Pages - Admin
import DashboardAdmin from './pages/Admin/DashboardAdmin';
import ManageUsers from './pages/Admin/ManageUsers';

// Pages - User
import UserDashboard from './pages/User/UserDashboard';
import UserProfile from './pages/User/UserProfile';

/**
 * Componente de protección de rutas.
 */
import useStore from './store/store';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.rol_nombre)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

/**
 * Enrutador principal de la aplicación.
 */
const router = createBrowserRouter([
  // ─── Rutas públicas ───────────────────────────────────────
  {
    path: '/',
    element: <Home />,
  },

  // ─── Rutas de autenticación ───────────────────────────────
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <Login /> },
    ],
  },

  // ─── Rutas de administrador ───────────────────────────────
  {
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/admin/dashboard', element: <DashboardAdmin /> },
      { path: '/admin/usuarios', element: <ManageUsers /> },
    ],
  },

  // ─── Rutas de usuario ─────────────────────────────────────
  {
    element: (
      <ProtectedRoute>
        <UserLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/user/dashboard', element: <UserDashboard /> },
      { path: '/user/perfil', element: <UserProfile /> },
    ],
  },
]);

export default router;
