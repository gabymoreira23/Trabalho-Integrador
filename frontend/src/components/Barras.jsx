import { rotulo } from '../utils/rotulos.js';

// gráfico de barras horizontal dados = { aberto: 2, concluido: 5 }, ordem = ['aberto', 'concluido']
export default function Barras({ dados, ordem }) {
  const maximo = Math.max(1, ...ordem.map((chave) => dados[chave] || 0));
  return (
    <ul className="barras">
      {ordem.map((chave) => (
        <li key={chave}>
          <span className="barras__rotulo">{rotulo(chave)}</span>
          <span className="barras__trilho" aria-hidden="true">
            <span
              className={`barras__preenchimento barras__preenchimento--${chave}`}
              style={{ width: `${((dados[chave] || 0) / maximo) * 100}%` }}
            />
          </span>
          <span className="barras__valor">{dados[chave] || 0}</span>
        </li>
      ))}
    </ul>
  );
}
