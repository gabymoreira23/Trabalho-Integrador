import { rotulo } from '../utils/rotulos.js';

// etiqueta colorida
export default function Badge({ valor, texto }) {
  return <span className={`badge badge--${valor}`}>{texto ?? rotulo(valor)}</span>;
}
