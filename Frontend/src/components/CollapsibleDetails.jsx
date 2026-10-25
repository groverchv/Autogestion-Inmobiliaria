import { useState, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import './SimpleUI.css';

/**
 * Detalles técnicos ocultos detrás de "Ver detalles".
 * Para IDs, hashes, historiales y datos que el usuario común no necesita.
 */
const CollapsibleDetails = ({ label = 'Ver detalles', children }) => {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  return (
    <div className="collapsible">
      <button
        type="button"
        className="collapsible__toggle"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen(!open)}
      >
        {open ? 'Ocultar detalles' : label}
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && <div id={bodyId} className="collapsible__body">{children}</div>}
    </div>
  );
};

export default CollapsibleDetails;
