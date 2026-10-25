import { Clock, Loader, CheckCircle2, AlertCircle, MinusCircle } from 'lucide-react';
import './SimpleUI.css';

/**
 * Píldora de estado en lenguaje llano.
 * Recibe el estado técnico del backend y muestra lo que el usuario entiende.
 */
const STATUS_MAP = {
  // Visitas
  pendiente:    { label: 'Esperando respuesta',  variant: 'pendiente',  icon: Clock },
  confirmada:   { label: 'Visita confirmada',    variant: 'listo',      icon: CheckCircle2 },
  completada:   { label: 'Visita realizada',     variant: 'neutro',     icon: CheckCircle2 },
  cancelada:    { label: 'Cancelada',            variant: 'neutro',     icon: MinusCircle },
  // Contratos
  borrador:     { label: 'En preparación',       variant: 'neutro',     icon: Clock },
  enviado:      { label: 'Esperando firma',      variant: 'en-proceso', icon: Loader },
  aceptado:     { label: 'Firmado',              variant: 'listo',      icon: CheckCircle2 },
  activo:       { label: 'Vigente',              variant: 'listo',      icon: CheckCircle2 },
  rechazado:    { label: 'Rechazado',            variant: 'problema',   icon: AlertCircle },
  finalizado:   { label: 'Terminado',            variant: 'neutro',     icon: MinusCircle },
  cancelado:    { label: 'Cancelado',            variant: 'neutro',     icon: MinusCircle },
  // Pagos
  completado:   { label: 'Pagado',               variant: 'listo',      icon: CheckCircle2 },
  fallido:      { label: 'No se pudo cobrar',    variant: 'problema',   icon: AlertCircle },
  reembolsado:  { label: 'Devuelto',             variant: 'neutro',     icon: MinusCircle },
  // Verificación de título
  verificado:   { label: 'Documento revisado',   variant: 'listo',      icon: CheckCircle2 },
  observado:    { label: 'Requiere revisión',    variant: 'pendiente',  icon: Clock },
  error:        { label: 'No se pudo revisar',   variant: 'problema',   icon: AlertCircle },
  // Publicación
  oculto:       { label: 'Pausado',              variant: 'neutro',     icon: MinusCircle },
  publicado:    { label: 'Publicado',            variant: 'listo',      icon: CheckCircle2 },
};

const SimpleStatus = ({ status, label }) => {
  const conf = STATUS_MAP[status] || { label: label || status, variant: 'neutro', icon: MinusCircle };
  const Icon = conf.icon;
  return (
    <span className={`simple-status simple-status--${conf.variant}`}>
      <Icon size={13} aria-hidden="true" />
      {label || conf.label}
    </span>
  );
};

export default SimpleStatus;
