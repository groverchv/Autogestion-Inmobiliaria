import { createBrowserRouter, Navigate } from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import AuthLayout from './layouts/AuthLayout';
import UserLayout from './layouts/UserLayout';

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
import MiAgenda from './pages/Public/MiAgenda';
import PagoExitoso from './pages/Public/PagoExitoso';
import PagoCancelado from './pages/Public/PagoCancelado';
import MisContratos from './pages/Public/MisContratos';
import MisPagos from './pages/Public/MisPagos';
import MiActividad from './pages/Public/MiActividad';
import WizardPublicar from './pages/Public/WizardPublicar';
import LegalPage from './pages/Legal/LegalPage';

// Pages - Admin
import DashboardAdmin from './pages/Admin/DashboardAdmin';
import ManageUsers from './pages/Admin/ManageUsers';
import ManageCategorias from './pages/Admin/ManageCategorias';
import ManageInmuebles from './pages/Admin/ManageInmuebles';
import ManageContratos from './pages/Admin/ManageContratos';
import ManageTipoContrato from './pages/Admin/ManageTipoContrato';
import ManagePagos from './pages/Admin/ManagePagos';
import ManageTipoPagos from './pages/Admin/ManageTipoPagos';
import ManageHistorialPagos from './pages/Admin/ManageHistorialPagos';
import ManageAgenda from './pages/Admin/ManageAgenda';
import ManageNotificaciones from './pages/Admin/ManageNotificaciones';
import ManageFavoritos from './pages/Admin/ManageFavoritos';
import FinanzasAdmin from './pages/Admin/FinanzasAdmin';
import ManageBlockchain from './pages/Admin/ManageBlockchain';
import FinanzasPropietario from './pages/Public/FinanzasPropietario';
import AuditoriaCheckInOut from './pages/Panel/AuditoriaCheckInOut';

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
    element: <UserLayout />,
    children: [
      {
        path: '/propiedades',
        element: <Propiedades />,
      },
      {
        path: '/propiedades/:id',
        element: <PropiedadDetalle />,
      },
      {
        path: '/pago-exitoso',
        element: <PagoExitoso />,
      },
      {
        path: '/pago-cancelado',
        element: <PagoCancelado />,
      },
      { path: '/privacidad', element: <LegalPage doc="privacidad" /> },
      { path: '/terminos', element: <LegalPage doc="terminos" /> },
      { path: '/cookies', element: <LegalPage doc="cookies" /> },
      { path: '/reembolsos', element: <LegalPage doc="reembolsos" /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: '/mis-inmuebles',
            element: <MisInmuebles />,
          },
          {
            path: '/auditoria-checkout',
            element: <AuditoriaCheckInOut />,
          },
          {
            path: '/mi-actividad',
            element: <MiActividad />,
          },
          {
            path: '/publicar',
            element: <WizardPublicar />,
          },
          {
            path: '/mi-agenda',
            element: <MiAgenda />,
          },
          {
            path: '/mis-contratos',
            element: <MisContratos />,
          },
          {
            path: '/mis-pagos',
            element: <MisPagos />,
          },
          {
            path: '/mis-finanzas',
            element: <FinanzasPropietario />,
          },
          {
            path: '/favoritos',
            element: <MisFavoritos />,
          },
          {
            path: '/notificaciones',
            element: <MisNotificaciones />,
          },
          {
            path: '/perfil',
            element: <MiPerfil />,
          },
          {
            path: '/mensajes',
            element: <MisMensajes />,
          },
        ],
      },
    ],
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
      { path: 'auditorias', element: <AuditoriaCheckInOut /> },
      { path: 'blockchain', element: <ManageBlockchain /> },
      { path: 'finanzas', element: <FinanzasAdmin /> },
      { path: 'usuarios', element: <ManageUsers /> },
      { path: 'inmuebles', element: <ManageInmuebles /> },
      { path: 'categorias', element: <ManageCategorias /> },
      { path: 'contratos', element: <ManageContratos /> },
      { path: 'pagos', element: <ManagePagos /> },
      { path: 'tipo-pagos', element: <ManageTipoPagos /> },
      { path: 'historial-pagos', element: <ManageHistorialPagos /> },
      { path: 'agenda', element: <ManageAgenda /> },
      { path: 'tipo-contrato', element: <ManageTipoContrato /> },
      { path: 'notificaciones', element: <ManageNotificaciones /> },
      { path: 'favoritos', element: <ManageFavoritos /> },
    ],
  },
]);

export default router;
