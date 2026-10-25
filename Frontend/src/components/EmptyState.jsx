import { Link } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import './SimpleUI.css';

/**
 * Estado vacío con guía: icono + título + frase + botón de acción.
 * Nunca dejar una pantalla vacía sin decirle al usuario qué hacer.
 */
const EmptyState = ({ icon: Icon = Inbox, title, text, actionLabel, actionTo, onAction }) => (
  <div className="empty-state">
    <div className="empty-state__icon"><Icon size={34} aria-hidden="true" /></div>
    <h3 className="empty-state__title">{title}</h3>
    {text && <p className="empty-state__text">{text}</p>}
    {actionLabel && actionTo && (
      <Link to={actionTo} className="btn btn--primary" style={{ display: 'inline-block', padding: '10px 24px' }}>
        {actionLabel}
      </Link>
    )}
    {actionLabel && onAction && (
      <button type="button" className="btn btn--primary" onClick={onAction} style={{ padding: '10px 24px' }}>
        {actionLabel}
      </button>
    )}
  </div>
);

export default EmptyState;
