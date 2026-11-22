import { useEffect, useRef } from 'react';

export default function Modal({ titulo, aoFechar, largura = 'media', children }) {
  const dialogoRef = useRef(null);

  useEffect(() => {
    const dialogo = dialogoRef.current;
    if (!dialogo.open) dialogo.showModal(); 
  }, []);

  return (
    <dialog
      ref={dialogoRef}
      className={`modal modal--${largura}`}
      aria-labelledby="modal-titulo"
      onClose={() => { if (!dialogoRef.current?.open) aoFechar(); }} 
      onClick={(e) => { if (e.target === e.currentTarget) aoFechar(); }} 
    >
      <div className="modal__topo">
        <h2 id="modal-titulo">{titulo}</h2>
        <button type="button" className="modal__fechar" aria-label="Fechar" onClick={aoFechar}>×</button>
      </div>
      <div className="modal__corpo">{children}</div>
    </dialog>
  );
}
