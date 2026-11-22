import { useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { useFormulario } from '../hooks/useFormulario.js';
import Cartao from '../components/Cartao.jsx';
import Campo from '../components/Campo.jsx';
import Badge from '../components/Badge.jsx';
import Carregando from '../components/Carregando.jsx';
import EstadoErro from '../components/EstadoErro.jsx';
import { dataBR, dataHoraBR, numeroChamado } from '../utils/formatacao.js';
import { opcoesDe, rotulo } from '../utils/rotulos.js';

const ETAPAS = ['aberto', 'em_analise', 'em_execucao', 'concluido'];

function Etapas({ status }) {
  const atual = ETAPAS.indexOf(status);
  return (
    <ol className="etapas" aria-label="Andamento do chamado">
      {ETAPAS.map((etapa, i) => (
        <li key={etapa} aria-current={i === atual ? 'step' : undefined}
          className={i < atual ? 'etapas__item--feito' : i === atual ? 'etapas__item--atual' : ''}>
          <span className="etapas__bolinha" aria-hidden="true" />
          <span>{rotulo(etapa)}</span>
        </li>
      ))}
    </ol>
  );
}

function Historico({ lista }) {
  return (
    <Cartao titulo="Histórico">
      {lista.length === 0 ? <p className="vazio">Sem registros.</p> : (
        <table className="tabela tabela--simples">
          <thead><tr><th scope="col">Data</th><th scope="col">Atualização</th></tr></thead>
          <tbody>
            {lista.map((x) => (
              <tr key={x.id}><td data-label="Data">{dataHoraBR(x.criado_em)}</td><td data-label="Atualização">{x.descricao}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </Cartao>
  );
}

function Resumo({ c }) {
  return (
    <Cartao titulo="Dados do chamado">
      <dl className="detalhes">
        <div><dt>Imóvel</dt><dd>{`${c.imovel_codigo} — ${c.imovel_endereco}`}</dd></div>
        <div><dt>Solicitante</dt><dd>{c.solicitante_nome}</dd></div>
        <div><dt>Categoria</dt><dd>{rotulo(c.categoria)}</dd></div>
        <div><dt>Urgência</dt><dd><Badge valor={c.urgencia} /></dd></div>
        <div><dt>Canal do pedido</dt><dd>{rotulo(c.canal)}</dd></div>
        <div><dt>Aberto em</dt><dd>{dataHoraBR(c.criado_em)}</dd></div>
        <div className="detalhes__item--inteiro"><dt>Descrição</dt><dd>{c.descricao}</dd></div>
        {c.status === 'concluido' && (
          <div className="detalhes__item--inteiro"><dt>Solução aplicada</dt><dd>{`${c.solucao} (concluído em ${dataBR(c.data_conclusao)})`}</dd></div>
        )}
      </dl>
    </Cartao>
  );
}

function FormularioTratamento({ chamado, funcionarios, aoSalvar }) {
  const { mostrar } = useToast();
  const { valores, handleChange } = useFormulario({
    prioridade: chamado.prioridade || '',
    responsavel_id: chamado.responsavel_id ? String(chamado.responsavel_id) : '',
    prazo: chamado.prazo || '',
    status: chamado.status,
    andamento: '',
    data_conclusao: chamado.data_conclusao || '',
    solucao: chamado.solucao || '',
  });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      await api(`/chamados/${chamado.id}`, { metodo: 'PUT', corpo: valores });
      mostrar('Chamado atualizado.');
      aoSalvar();
    } catch (e2) {
      setErro(e2.message);
      setSalvando(false);
    }
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      {erro && <div className="alerta" role="alert">{erro}</div>}
      <Campo rotulo="Prioridade">
        <select name="prioridade" value={valores.prioridade} onChange={handleChange}>
          <option value="">— não definida —</option>
          {opcoesDe('baixa', 'media', 'alta').map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select>
      </Campo>
      <Campo rotulo="Responsável">
        <select name="responsavel_id" value={valores.responsavel_id} onChange={handleChange}>
          <option value="">— não atribuído —</option>
          {funcionarios.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>
      </Campo>
      <Campo rotulo="Prazo previsto"><input type="date" name="prazo" value={valores.prazo} onChange={handleChange} /></Campo>
      <Campo rotulo="Situação">
        <select name="status" required value={valores.status} onChange={handleChange}>
          {opcoesDe(...ETAPAS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select>
      </Campo>
      <Campo rotulo="Andamento" inteira>
        <textarea name="andamento" rows={2} maxLength={500} placeholder="Registre o que foi feito (vai para o histórico)" value={valores.andamento} onChange={handleChange} />
      </Campo>
      <Campo rotulo="Data de conclusão" dica="Se vazia, usa a data de hoje ao concluir.">
        <input type="date" name="data_conclusao" value={valores.data_conclusao} onChange={handleChange} />
      </Campo>
      <Campo rotulo="Solução aplicada">
        <input type="text" name="solucao" maxLength={500} placeholder="Obrigatória para concluir" value={valores.solucao} onChange={handleChange} />
      </Campo>
      <div className="botoes campo--inteiro">
        <button type="submit" className="botao" disabled={salvando}>Salvar atualização</button>
      </div>
    </form>
  );
}

export default function ChamadoDetalhe({ id }) {
  const { usuario } = useAuth();
  const equipe = usuario.tipo === 'funcionario';
  const chamado = useFetch(`/chamados/${id}`);
  const funcionarios = useFetch(equipe ? '/pessoas' : null, { tipo: 'funcionario', ordenar: 'nome' });

  if (chamado.carregando || (equipe && funcionarios.carregando)) return <Carregando />;
  if (chamado.erro) return <EstadoErro erro={chamado.erro} aoTentarNovamente={chamado.recarregar} />;
  if (equipe && funcionarios.erro) return <EstadoErro erro={funcionarios.erro} aoTentarNovamente={funcionarios.recarregar} />;

  const c = chamado.dados;
  return (
    <>
      <header className="pagina__cabecalho">
        <div>
          <a className="pagina__voltar" href="#/chamados">← Voltar para chamados</a>
          <h1>{`Chamado ${numeroChamado(c.id)}`}</h1>
          <p className="subtitulo">{`${rotulo(c.categoria)} · ${c.imovel_codigo}`}</p>
        </div>
        <Badge valor={c.status} />
      </header>

      {equipe ? (
        <>
          <Resumo c={c} />
          <Cartao titulo="Classificação e andamento">
            {/* "key" recria o formulário com os valores atualizados depois de cada salvamento */}
            <FormularioTratamento key={chamado.atualizadoEm?.getTime()} chamado={c} funcionarios={funcionarios.dados} aoSalvar={chamado.recarregar} />
          </Cartao>
        </>
      ) : (
        <>
          <Cartao titulo="Andamento"><Etapas status={c.status} /></Cartao>
          <Resumo c={c} />
        </>
      )}
      <Historico lista={c.historico} />
    </>
  );
}
