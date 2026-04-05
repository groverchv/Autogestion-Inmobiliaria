import { createBrowserRouter } from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages - Public
import Home from './pages/Public/Home';
import Login from './pages/Public/Login';
import Registro from './pages/Public/Registro';
import Propiedades from './pages/Public/Propiedades';
import MisFavoritos from './pages/Public/MisFavoritos';

// Pages - Admin
import DashboardAdmin from './pages/Admin/DashboardAdmin';
import ManageUsers from './pages/Admin/ManageUsers';
import ManageCategorias from './pages/Admin/ManageCategorias';
import ManageInmuebles from './pages/Admin/ManageInmuebles';
import ManageContratos from './pages/Admin/ManageContratos';
import ManagePagos from './pages/Admin/ManagePagos';
import ManageTipoPagos from './pages/Admin/ManageTipoPagos';
import ManageHistorialPagos from './pages/Admin/ManageHistorialPagos';
import ManageAgenda from './pages/Admin/ManageAgenda';
import ManageNotificaciones from './pages/Admin/ManageNotificaciones';
import ManageFavoritos from './pages/Admin/ManageFavoritos';

/**
 * Enrutador principal de la aplicación.
 * SOLO el admin puede acceder al panel (/panel/*).
 * Los usuarios solo ven las páginas públicas.
 */
const router = createBrowserRouter([
  // ─── Rutas públicas ───────────────────────────────────────
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/propiedades',
    element: <Propiedades />,
  },
  {
    path: '/favoritos',
    element: <ProtectedRoute><MisFavoritos /></ProtectedRoute>,
  },

  // ─── Rutas de autenticación ───────────────────────────────
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/registro', element: <Registro /> },
    ],
  },

  // ─── Panel Administrativo (SOLO ADMIN) ────────────────────
  {
    path: '/panel',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: <DashboardAdmin /> },
      { path: 'usuarios', element: <ManageUsers /> },
      { path: 'inmuebles', element: <ManageInmuebles /> },
      { path: 'categorias', element: <ManageCategorias /> },
      { path: 'contratos', element: <ManageContratos /> },
      { path: 'pagos', element: <ManagePagos /> },
      { path: 'tipo-pagos', element: <ManageTipoPagos /> },
      { path: 'historial-pagos', element: <ManageHistorialPagos /> },
      { path: 'agenda', element: <ManageAgenda /> },
      { path: 'notificaciones', element: <ManageNotificaciones /> },
      { path: 'favoritos', element: <ManageFavoritos /> },
    ],
  },
]);

export default router;
