import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import inmuebleService from '../../services/inmuebleService';
import InmuebleCard from '../../components/InmuebleCard';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import './Inmuebles.css';

/**
 * Vista de listado de inmuebles del usuario (Smart Component).
 * Maneja estados de loading, error, data y eliminación con modal de confirmación.
 */
const InmueblesList = () => {
  const navigate = useNavigate();

  // ─── Estado ────────────────────────────────────────────────
  const [inmuebles, setInmuebles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal de eliminación
  const [deleteModal, setDeleteModal] = useState({ open: false, inmueble: null });
  const [deleting, setDeleting] = useState(false);

  // ─── Carga de datos ────────────────────────────────────────
  const fetchInmuebles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inmuebleService.getAll();
      // La API puede devolver paginado ({ results: [...] }) o un array directo
      setInmuebles(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'No se pudieron cargar los inmuebles. Intenta de nuevo.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInmuebles();
  }, [fetchInmuebles]);

  // ─── Acciones ──────────────────────────────────────────────
  const handleEdit = (id) => {
    navigate(`/user/inmuebles/${id}/editar`);
  };

  const handleDeleteClick = (inmueble) => {
    setDeleteModal({ open: true, inmueble });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.inmueble) return;
    setDeleting(true);
    try {
      await inmuebleService.delete(deleteModal.inmueble.id);
      // Eliminar del estado local sin re-fetch
      setInmuebles((prev) => prev.filter((i) => i.id !== deleteModal.inmueble.id));
      setDeleteModal({ open: false, inmueble: null });
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'No se pudo eliminar el inmueble. Puede que tenga contratos activos.';
      setError(message);
      setDeleteModal({ open: false, inmueble: null });
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ open: false, inmueble: null });
  };

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="inmuebles-page" id="inmuebles-list-page">
      {/* Header */}
      <div className="inmuebles-page__header">
        <div>
          <h1 className="inmuebles-page__title">Mis Inmuebles</h1>
          <p className="inmuebles-page__subtitle">
            Gestiona tus propiedades publicadas
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate('/user/inmuebles/nuevo')}
        >
          ➕ Publicar Inmueble
        </Button>
      </div>

      {/* Error global */}
      {error && (
        <div className="inmuebles-page__alert inmuebles-page__alert--error">
          ⚠️ {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="inmuebles-page__loading">
          <div className="inmuebles-page__loading-spinner" />
          <p>Cargando inmuebles...</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && inmuebles.length === 0 && (
        <div className="inmuebles-page__empty">
          <span className="inmuebles-page__empty-icon">🏘️</span>
          <p>Aún no tienes inmuebles publicados</p>
          <Button
            variant="primary"
            onClick={() => navigate('/user/inmuebles/nuevo')}
          >
            Publicar mi primer inmueble
          </Button>
        </div>
      )}

      {/* Grid de tarjetas */}
      {!loading && inmuebles.length > 0 && (
        <div className="inmuebles-grid">
          {inmuebles.map((inmueble) => (
            <InmuebleCard
              key={inmueble.id}
              inmueble={inmueble}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      {/* Modal de eliminación */}
      <Modal
        isOpen={deleteModal.open}
        onClose={handleDeleteCancel}
        title="Eliminar Inmueble"
        size="sm"
      >
        <div className="delete-confirm">
          <p className="delete-confirm__message">
            ¿Estás seguro de que deseas eliminar este inmueble?
          </p>
          <p className="delete-confirm__name">
            {deleteModal.inmueble?.titulo}
          </p>
          <p className="delete-confirm__message" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warning)' }}>
            ⚠️ Esta acción no se puede deshacer. Se eliminarán también todas las imágenes asociadas.
          </p>
          <div className="delete-confirm__actions">
            <Button variant="secondary" onClick={handleDeleteCancel} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm} loading={deleting}>
              Sí, eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InmueblesList;
