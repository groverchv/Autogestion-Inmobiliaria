import { Link } from 'react-router-dom';
import { BellRing } from 'lucide-react';
import './SimpleUI.css';

/**
 * Tarjeta destacada "Tienes algo pendiente" — va arriba de las listas.
 * Lo que necesita acción del usuario se muestra primero, con botón.
 */
const ActionNeeded = ({ icon: Icon = BellRing, title, text, actionLabel, actionTo, onAction }) => (
  <div className="action-needed" role="status">
    <div className="action-needed__icon"><Icon size={22} aria-hidden="true" /></div>
    <div>
      <p className="action-needed__title">{title}</p>
      {text && <p className="action-needed__text">{text}</p>}
    </div>
    {actionLabel && actionTo && (
      <Link to={actionTo} className="action-needed__btn">{actionLabel}</Link>
    )}
    {actionLabel && onAction && (
      <button type="button" className="action-needed__btn" onClick={onAction}>{actionLabel}</button>
    )}
  </div>
);

export default ActionNeeded;
