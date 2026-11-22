import Modal from './Modal.jsx';

// pergunta "tem certeza?" antes de uma ação sem volta
export default function Confirmacao({ mensagem, textoOk = 'Confirmar', perigo = false, aoConfirmar, aoCancelar }) {
  return (
    <Modal titulo="Confirmação" largura="pequena" aoFechar={aoCancelar}>
      <p className="modal__texto">{mensagem}</p>
      <div className="botoes">
        <button type="button" className="botao botao--secundario" onClick={aoCancelar}>Cancelar</button>
        <button type="button" className={`botao ${perigo ? 'botao--perigo' : ''}`} onClick={aoConfirmar}>{textoOk}</button>
      </div>
    </Modal>
  );
}
