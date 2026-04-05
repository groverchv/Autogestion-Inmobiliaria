import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
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
  const [searchTerm, setSearchTerm] = useState('');

  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/inmuebles/lista/'),
      api.get('/inmuebles/tipos/'),
    ]).then(([inmRes, catRes]) => {
      setInmuebles(inmRes.data.results || inmRes.data);
      setCategorias(catRes.data.results || catRes.data);
    }).catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

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

  const filteredInmuebles = inmuebles.filter(inm => {
    if (filtroCategoria && inm.tipo_nombre !== filtroCategoria) return false;
    if (filtroCiudad && !inm.ciudad?.toLowerCase().includes(filtroCiudad.toLowerCase())) return false;
    if (filtroPrecioMax && parseFloat(inm.precio) > parseFloat(filtroPrecioMax)) return false;
    if (searchTerm && !inm.titulo?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const estadoColors = {
    disponible: { bg: '#dcfce7', color: '#15803d' },
    ocupado: { bg: '#fee2e2', color: '#dc2626' },
    mantenimiento: { bg: '#fef3c7', color: '#d97706' },
    reservado: { bg: '#dbeafe', color: '#2563eb' },
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
            placeholder="Buscar por título..."
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
          <input
            type="text"
            placeholder="Ciudad..."
            value={filtroCiudad}
            onChange={e => setFiltroCiudad(e.target.value)}
            className="propiedades-filter__input"
          />
          <input
            type="number"
            placeholder="Precio máximo (Bs)"
            value={filtroPrecioMax}
            onChange={e => setFiltroPrecioMax(e.target.value)}
            className="propiedades-filter__input"
          />
          <span className="propiedades-filter__count">{filteredInmuebles.length} resultados</span>
        </div>

        {loading ? (
          <div className="propiedades-loading">Cargando propiedades...</div>
        ) : (
          <div className="propiedades-grid">
            {filteredInmuebles.map(inm => {
              const estadoStyle = estadoColors[inm.estado] || estadoColors.disponible;
              return (
                <div key={inm.id} className="propiedad-card">
                  <div className="propiedad-card__image">
                    {inm.imagen_principal ? (
                      <img src={inm.imagen_principal} alt={inm.titulo} />
                    ) : (
                      <div className="propiedad-card__placeholder">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                      </div>
                    )}
                    <span className="propiedad-card__badge" style={{ background: estadoStyle.bg, color: estadoStyle.color }}>
                      {inm.estado}
                    </span>
                    {inm.tipo_nombre && (
                      <span className="propiedad-card__category">{inm.tipo_nombre}</span>
                    )}
                    <button 
                      className={`propiedad-card__fav-btn ${inm.is_favorito ? 'propiedad-card__fav-btn--active' : ''}`}
                      onClick={(e) => toggleFavorite(inm.id, e)}
                    >
                      <svg width="20" height="20" fill={inm.is_favorito ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    </button>
                  </div>
                  <div className="propiedad-card__body">
                    <h3 className="propiedad-card__title">{inm.titulo}</h3>
                    <p className="propiedad-card__location">{inm.ciudad}{inm.zona ? `, ${inm.zona}` : ''}</p>
                    <div className="propiedad-card__attrs">
                      {inm.habitaciones > 0 && <span>{inm.habitaciones} hab.</span>}
                      {inm.banos > 0 && <span>{inm.banos} baños</span>}
                    </div>
                    <div className="propiedad-card__footer">
                      <span className="propiedad-card__price">Bs. {parseFloat(inm.precio).toLocaleString()}</span>
                      <Link to={`/propiedades/${inm.id}`} className="propiedad-card__cta">Ver detalles</Link>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredInmuebles.length === 0 && (
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
