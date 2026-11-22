import { useEffect } from 'react';
import { useFetch } from '../hooks/useFetch.js';
import Badge from '../components/Badge.jsx';
import Carregando from '../components/Carregando.jsx';
import { dataBR, dataHoraBR, moeda } from '../utils/formatacao.js';
import { rotulo, tituloVistoria } from '../utils/rotulos.js';

function Tabela({ colunas, linhas }) {
  return (
    <table className="tabela tabela--simples">
      <thead><tr>{colunas.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
      <tbody>{linhas.map((l, i) => <tr key={i}>{l.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
    </table>
  );
}

export default function Laudo({ id }) {
  const { dados: v, erro, carregando } = useFetch(`/vistorias/${id}`);

  useEffect(() => {
    if (v) document.title = `Laudo de vistoria — ${v.imovel_codigo}`;
  }, [v]);

  if (carregando) return <main className="laudo"><Carregando texto="Carregando laudo…" /></main>;
  if (erro) {
    return (
      <main className="laudo">
        <p className="estado-erro" role="alert">{erro.status === 403 ? 'Você não tem permissão para ver este laudo.' : erro.message}</p>
      </main>
    );
  }

  const responsavel = v.assinaturas.find((a) => a.papel === 'responsavel');
  const cliente = v.assinaturas.find((a) => a.papel === 'cliente');

  return (
    <div className="corpo--laudo">
      <main className="laudo">
        <div className="nao-imprimir laudo__barra">
          <button type="button" className="botao" onClick={() => window.print()}>Imprimir / Salvar como PDF</button>
          <button type="button" className="botao botao--secundario" onClick={() => window.close()}>Fechar</button>
        </div>

        <header className="laudo__topo">
          <p className="marca"><span className="marca__ponto" aria-hidden="true" /> Fênix Imóveis</p>
          <h1>Laudo de vistoria</h1>
          <p>{`${tituloVistoria(v.tipo)} · ${dataBR(v.data)} às ${v.horario}`}</p>
        </header>

        <section>
          <h2>Dados</h2>
          <dl className="detalhes">
            <div><dt>Imóvel</dt><dd>{`${v.imovel_codigo} — ${v.imovel_endereco}`}</dd></div>
            <div><dt>Responsável</dt><dd>{v.responsavel_nome}</dd></div>
            <div><dt>Inquilino/Proprietário</dt><dd>{v.cliente_nome}</dd></div>
            {v.observacoes && <div><dt>Observações</dt><dd>{v.observacoes}</dd></div>}
          </dl>
        </section>

        <section>
          <h2>Checklist</h2>
          {v.itens.length
            ? <Tabela colunas={['Cômodo / item', 'Estado', 'Observações']} linhas={v.itens.map((i) => [i.comodo_item, <Badge valor={i.estado} />, i.observacoes || '—'])} />
            : <p>Sem itens.</p>}
        </section>

        <section>
          <h2>Parecer</h2>
          <p>Conclusão: {v.conclusao ? <Badge valor={v.conclusao} /> : '—'} {`· Data: ${dataBR(v.parecer_data)}`}</p>
          {v.pendencias && <p><strong>Pendências: </strong>{v.pendencias}</p>}
          {v.parecer_obs && <p><strong>Observações: </strong>{v.parecer_obs}</p>}
        </section>

        {v.reparos.length > 0 && (
          <section>
            <h2>Orçamento de reparos</h2>
            <Tabela colunas={['Item', 'Descrição', 'Valor']} linhas={v.reparos.map((r) => [r.item, r.descricao || '—', moeda(r.valor)])} />
            <p className="laudo__total">{`Total do orçamento: ${moeda(v.total_orcamento)}`}</p>
          </section>
        )}

        <section className="laudo__assinaturas">
          <h2>Assinaturas</h2>
          <div className="assinaturas">
            {[[responsavel, 'Responsável pela vistoria'], [cliente, 'Cliente']].map(([a, titulo]) => (
              <figure key={titulo} className="laudo__assinatura">
                {a ? <img src={a.imagem} alt={`Assinatura de ${a.nome}`} /> : <div className="laudo__sem-assinatura">Não assinada</div>}
                <figcaption>{`${titulo}: ${a ? a.nome : '—'}`}{a && <small>{` · ${dataHoraBR(a.assinado_em)}`}</small>}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
