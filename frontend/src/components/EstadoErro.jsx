export default function EstadoErro({ erro, aoTentarNovamente }) {
  return (
    <div className="estado-erro" role="alert">
      <p>{erro?.message || 'Não foi possível carregar os dados.'}</p>
      {aoTentarNovamente && (
        <button type="button" className="botao botao--secundario" onClick={aoTentarNovamente}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}
