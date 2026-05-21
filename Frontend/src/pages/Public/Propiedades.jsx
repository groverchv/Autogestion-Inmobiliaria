import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import inmuebleService from '../../services/inmuebleService';
import useAuth from '../../hooks/useAuth';
import Navbar from '../../components/Navbar';
import UserMenu from '../../components/UserMenu';
import './Propiedades.css';

const Propiedades = () => {
  const [inmuebles, setInmuebles] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroCiudad, setFiltroCiudad] = useState('');
  const [filtroPrecioMax, setFiltroPrecioMax] = useState('');
  const [filtroHabitaciones, setFiltroHabitaciones] = useState('');
  const [filtroBanos, setFiltroBanos] = useState('');
  const [filtroGaraje, setFiltroGaraje] = useState(false);
  const [filtroTipoOferta, setFiltroTipoOferta] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Cargar solo los tipos la primera vez
    api.get('/inmuebles/tipos/')
      .then(res => setCategorias(res.data.results || res.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setLoading(true);
      const filters = {};
      if (searchTerm) filters.search = searchTerm;
      if (filtroCategoria) filters.tipo = categorias.find(c => c.nombre === filtroCategoria)?.id || '';
      if (filtroCiudad) filters.ciudad = filtroCiudad;
      if (filtroPrecioMax) filters.precio_max = filtroPrecioMax;
      if (filtroHabitaciones) filters.habitaciones_min = filtroHabitaciones;
      if (filtroBanos) filters.banos_min = filtroBanos;
      if (filtroGaraje) filters.garaje = true;
      if (filtroTipoOferta) filters.tipo_oferta = filtroTipoOferta;

      inmuebleService.listarInmuebles(filters)
        .then(data => {
          setInmuebles(data.results || data);
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, filtroCategoria, filtroCiudad, filtroPrecioMax, filtroHabitaciones, filtroBanos, filtroGaraje, filtroTipoOferta, categorias]);

  const toggleFavorite = async (inmId, e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      const res = await api.post('/inmuebles/favoritos/toggle/', { inmueble: inmId });
      setInmuebles(prev => prev.map(inm =>
        inm.id === inmId ? { ...inm, is_favorito: res.data.is_favorito } : inm
      ));
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const estadoColors = {
    disponible: { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' },
    ocupado: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' },
    mantenimiento: { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' },
    reservado: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' },
  };

  const offerColors = {
    alquiler: { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', label: 'Alquiler', border: '1px solid rgba(16, 185, 129, 0.2)' },
    venta: { bg: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', label: 'Venta', border: '1px solid rgba(99, 102, 241, 0.2)' },
    anticretico: { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', label: 'Anticrético', border: '1px solid rgba(245, 158, 11, 0.2)' },
  };

  return (
    <div className="propiedades-page">
      <Navbar />

      {isAuthenticated && user?.rol !== 'admin' && (
        <UserMenu />
      )}

      <div className="propiedades-content">
        <div className="propiedades-filters">
          <input
            type="text"
            placeholder="Búsqueda general (Ej: Urbari, casa jardín, etc.)"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="propiedades-filter__input"
          />
          <select
            value={filtroCategoria}
            onChange={e => setFiltroCategoria(e.target.value)}
            className="propiedades-filter__select"
          >
            <option value="">Todas las categorías</option>
            {categorias.map(cat => (
              <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
            ))}
          </select>
          <select
            value={filtroTipoOferta}
            onChange={e => setFiltroTipoOferta(e.target.value)}
            className="propiedades-filter__select"
          >
            <option value="">Tipo de oferta: Todos</option>
            <option value="alquiler">Alquiler</option>
            <option value="venta">Venta</option>
            <option value="anticretico">Anticrético</option>
          </select>
          <input
            type="text"
            placeholder="Filtrar por Ciudad..."
            value={filtroCiudad}
            onChange={e => setFiltroCiudad(e.target.value)}
            className="propiedades-filter__input"
          />
          <input
            type="number"
            min="0"
            placeholder="Precio máximo (Bs)"
            value={filtroPrecioMax}
            onChange={e => {
              const val = e.target.value.replace(/^-/, '');
              if (val === '' || Number(val) >= 0) setFiltroPrecioMax(val);
            }}
            className="propiedades-filter__input"
          />
          <select
            value={filtroHabitaciones}
            onChange={e => setFiltroHabitaciones(e.target.value)}
            className="propiedades-filter__select"
          >
            <option value="">Habitaciones: Cualquiera</option>
            <option value="1">1 o más</option>
            <option value="2">2 o más</option>
            <option value="3">3 o más</option>
            <option value="4">4 o más</option>
          </select>
          <select
            value={filtroBanos}
            onChange={e => setFiltroBanos(e.target.value)}
            className="propiedades-filter__select"
          >
            <option value="">Baños: Cualquiera</option>
            <option value="1">1 o más</option>
            <option value="2">2 o más</option>
            <option value="3">3 o más</option>
          </select>
          <label className="propiedades-filter__checkbox-label">
            <input
              type="checkbox"
              checked={filtroGaraje}
              onChange={e => setFiltroGaraje(e.target.checked)}
            />
            Con Garaje
          </label>
          <span className="propiedades-filter__count">{inmuebles.length} resultados</span>
        </div>

        {loading ? (
          <div className="propiedades-loading">Cargando propiedades...</div>
        ) : (
          <div className="propiedades-grid">
            {inmuebles.map(inm => {
              const estadoStyle = estadoColors[inm.estado] || estadoColors.disponible;
              const offerStyle = offerColors[inm.tipo_oferta];
              const ciudad = inm.direccion?.ciudad || 'N/A';
              const zona = inm.direccion?.zona || '';
              return (
                <div key={inm.id} className="propiedad-card">
                  <div className="propiedad-card__image">
                    {inm.imagen_principal ? (
                      <img src={inm.imagen_principal} alt={inm.titulo} />
                    ) : (
                      <div className="propiedad-card__placeholder">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                      </div>
                    )}
                    <span className="propiedad-card__badge" style={{ background: estadoStyle.bg, color: estadoStyle.color, border: estadoStyle.border }}>
                      {inm.estado}
                    </span>
                    {offerStyle && (
                      <span className="propiedad-card__offer-badge" style={{ background: offerStyle.bg, color: offerStyle.color, border: offerStyle.border }}>
                        {offerStyle.label}
                      </span>
                    )}
                    {inm.tipo_nombre && (
                      <span className="propiedad-card__category">{inm.tipo_nombre}</span>
                    )}
                    <button
                      className={`propiedad-card__fav-btn ${inm.is_favorito ? 'propiedad-card__fav-btn--active' : ''}`}
                      onClick={(e) => toggleFavorite(inm.id, e)}
                    >
                      <svg width="20" height="20" fill={inm.is_favorito ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                  </div>
                  <div className="propiedad-card__body">
                    <h3 className="propiedad-card__title">{inm.titulo}</h3>
                    <p className="propiedad-card__location">{ciudad}{zona ? `, ${zona}` : ''}</p>
                    <div className="propiedad-card__attrs">
                      {inm.habitaciones > 0 && <span>{inm.habitaciones} hab.</span>}
                      {inm.banos > 0 && <span>{inm.banos} baños</span>}
                    </div>
                    <div className="propiedad-card__footer">
                      <span className="propiedad-card__price">
                        {inm.precio ? (
                          <>
                            Bs. {parseFloat(inm.precio).toLocaleString()}
                            {inm.tipo_oferta === 'alquiler' && <small style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--color-text-muted)', marginLeft: '4px' }}>/ mes</small>}
                            {inm.tipo_oferta === 'anticretico' && <small style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--color-text-muted)', marginLeft: '4px' }}> (Anticrético)</small>}
                          </>
                        ) : (
                          'Sin oferta activa'
                        )}
                      </span>
                      <Link to={`/propiedades/${inm.id}`} className="propiedad-card__cta">Ver detalles</Link>
                    </div>
                  </div>
                </div>
              );
            })}
            {inmuebles.length === 0 && (
              <div className="propiedades-empty">
                <p>No se encontraron propiedades con esos filtros.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Propiedades;
