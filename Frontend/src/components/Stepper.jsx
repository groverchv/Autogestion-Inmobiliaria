import './SimpleUI.css';

/**
 * Barra de progreso de pasos: "Paso 2 de 5 — Fotos".
 * Usar en wizards y procesos de varios pasos.
 */
const Stepper = ({ current, total, label }) => (
  <div className="stepper" role="progressbar" aria-valuenow={current} aria-valuemin={1} aria-valuemax={total} aria-label={label || `Paso ${current} de ${total}`}>
    <div className="stepper__label">
      <strong>Paso {current} de {total}</strong>
      {label && <span>{label}</span>}
    </div>
    <div className="stepper__bar">
      <div className="stepper__fill" style={{ width: `${(current / total) * 100}%` }} />
    </div>
  </div>
);

export default Stepper;
