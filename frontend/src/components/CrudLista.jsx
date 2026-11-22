import { useCallback, useState } from 'react';
import { api } from '../services/api.js';
import { useFetch } from '../hooks/useFetch.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { useToast } from '../contexts/ToastContext.jsx';
import FormularioCrud from './FormularioCrud.jsx';
import Confirmacao from './Confirmacao.jsx';
import Carregando from './Carregando.jsx';
import EstadoErro from './EstadoErro.jsx';


//uma única tela genérica serve para Pessoas, Imóveis, Contratos, Vistorias e Chamados

export default function CrudLista({ config }) {
  const { mostrar } = useToast();
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState({});
  const [ordem, setOrdem] = useState({ campo: config.ordenarPadrao, direcao: config.direcaoPadrao || 'asc' });
  const [formulario, setFormulario] = useState(null); 
  const [paraExcluir, setParaExcluir] = useState(null);

  const buscaAtrasada = useDebounce(busca, 300); // só busca depois que a pessoa para de digitar

  const { dados: itens, carregando, erro, recarregar } = useFetch(config.endpoint, {
    busca: buscaAtrasada.trim(),
    ...filtros,
    ordenar: ordem.campo,
    direcao: ordem.direcao,
  });

  function alternarOrdem(campo) {
    setOrdem((atual) => (atual.campo === campo
      ? { campo, direcao: atual.direcao === 'asc' ? 'desc' : 'asc' }
      : { campo, direcao: 'asc' }));
  }

  async function excluir() {
    const item = paraExcluir;
    setParaExcluir(null);
    try {
      await api(`${config.endpoint}/${item.id}`, { metodo: 'DELETE' });
      mostrar('Registro excluído.');
      recarregar();
    } catch (e) {
      mostrar(e.message, 'erro'); 
    }
  }


  const fecharFormulario = useCallback(() => setFormulario(null), []);
  const salvou = () => { fecharFormulario(); recarregar(); };

  return (
    <>
      <header className="pagina__cabecalho">
        <div>
          <h1>{config.titulo}</h1>
          {config.subtitulo && <p className="subtitulo">{config.subtitulo}</p>}
        </div>
        {config.criar !== false && (
          <button type="button" className="botao" onClick={() => setFormulario({ item: null })}>
            {config.rotuloNovo || 'Novo'}
          </button>
        )}
      </header>

      <section className="cartao">
        <div className="filtros" role="search">
          <label className="filtros__item filtros__item--busca">
            <span>Buscar</span>
            <input type="search" placeholder={config.buscaPlaceholder || 'Buscar…'} aria-label="Buscar"
              value={busca} onChange={(e) => setBusca(e.target.value)} />
          </label>
          {(config.filtros || []).map((f) => (
            <label key={f.nome} className="filtros__item">
              <span>{f.rotulo}</span>
              <select value={filtros[f.nome] || ''} onChange={(e) => setFiltros((atual) => ({ ...atual, [f.nome]: e.target.value }))}>
                <option value="">Todos</option>
                {f.opcoes.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
              </select>
            </label>
          ))}
        </div>

        {carregando && <Carregando />}
        {erro && <EstadoErro erro={erro} aoTentarNovamente={recarregar} />}

        {itens && !erro && (
          <>
            <div className="tabela__rolagem">
              <table className="tabela">
                <thead>
                  <tr>
                    {config.colunas.map((c) => {
                      if (!c.ordenar) return <th key={c.rotulo} scope="col">{c.rotulo}</th>;
                      const ativa = ordem.campo === c.ordenar;
                      const seta = ativa ? (ordem.direcao === 'asc' ? ' ▲' : ' ▼') : '';
                      return (
                        <th key={c.rotulo} scope="col" aria-sort={ativa ? (ordem.direcao === 'asc' ? 'ascending' : 'descending') : 'none'}>
                          <button type="button" className="tabela__ordenar" onClick={() => alternarOrdem(c.ordenar)}>{c.rotulo}{seta}</button>
                        </th>
                      );
                    })}
                    <th scope="col" className="tabela__col-acoes">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.length === 0 && (
                    <tr><td colSpan={config.colunas.length + 1} className="vazio">Nenhum registro encontrado.</td></tr>
                  )}
                  {itens.map((item) => (
                    <tr key={item.id}>
                      {config.colunas.map((c) => (
                        <td key={c.rotulo} data-label={c.rotulo}>{c.formatar ? c.formatar(item) : (item[c.campo] ?? '—')}</td>
                      ))}
                      <td className="tabela__col-acoes" data-label="Ações">
                        <div className="tabela__acoes">
                          {(config.acoes || []).map((a) => (
                            <button key={a.rotulo} type="button" className="botao botao--pequeno botao--secundario" onClick={() => a.aoClicar(item)}>{a.rotulo}</button>
                          ))}
                          {config.editar !== false && (
                            <button type="button" className="botao botao--pequeno botao--secundario" onClick={() => setFormulario({ item })}>Editar</button>
                          )}
                          {config.excluir !== false && (
                            <button type="button" className="botao botao--pequeno botao--perigo-secundario" onClick={() => setParaExcluir(item)}>Excluir</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="contador" aria-live="polite">{itens.length} {itens.length === 1 ? 'registro' : 'registros'}</p>
          </>
        )}
      </section>

      {formulario && (
        <FormularioCrud config={config} item={formulario.item} aoSalvar={salvou} aoFechar={fecharFormulario} />
      )}
      {paraExcluir && (
        <Confirmacao
          mensagem={`Excluir ${config.nomeItem ? config.nomeItem(paraExcluir) : 'este registro'}? Esta ação não pode ser desfeita.`}
          textoOk="Excluir" perigo aoConfirmar={excluir} aoCancelar={() => setParaExcluir(null)}
        />
      )}
    </>
  );
}
