export default function Campo({ rotulo, dica, inteira = false, obrigatorio = false, children }) {
  return (
    <label className={`campo ${inteira ? 'campo--inteiro' : ''}`}>
      <span>
        {rotulo}
        {obrigatorio && <span className="campo__obrigatorio" aria-hidden="true"> *</span>}
      </span>
      {children}
      {dica && <small className="dica">{dica}</small>}
    </label>
  );
}
