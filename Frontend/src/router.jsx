import { createBrowserRouter, Navigate } from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages - Public
import Login from './pages/Public/Login';
import Registro from './pages/Public/Registro';
import Propiedades from './pages/Public/Propiedades';
import PropiedadDetalle from './pages/Public/PropiedadDetalle';
import MisFavoritos from './pages/Public/MisFavoritos';
import MisNotificaciones from './pages/Public/MisNotificaciones';
import MiPerfil from './pages/Public/MiPerfil';
import MisMensajes from './pages/Public/MisMensajes';
import MisInmuebles from './pages/Public/MisInmuebles';

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
    element: <Navigate to="/propiedades" replace />,
  },
  {
    path: '/propiedades',
    element: <Propiedades />,
  },
  {
    path: '/propiedades/:id',
    element: <PropiedadDetalle />,
  },
  {
    path: '/mis-inmuebles',
    element: <ProtectedRoute><MisInmuebles /></ProtectedRoute>,
  },
  {
    path: '/favoritos',
    element: <ProtectedRoute><MisFavoritos /></ProtectedRoute>,
  },
  {
    path: '/notificaciones',
    element: <ProtectedRoute><MisNotificaciones /></ProtectedRoute>,
  },
  {
    path: '/perfil',
    element: <ProtectedRoute><MiPerfil /></ProtectedRoute>,
  },
  {
    path: '/mensajes',
    element: <ProtectedRoute><MisMensajes /></ProtectedRoute>,
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
