import { useAuth } from '../contexts/AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import Cartao from '../components/Cartao.jsx';
import Barras from '../components/Barras.jsx';
import Badge from '../components/Badge.jsx';
import Carregando from '../components/Carregando.jsx';
import EstadoErro from '../components/EstadoErro.jsx';
import { dataBR, numeroChamado } from '../utils/formatacao.js';
import { rotulo } from '../utils/rotulos.js';

const INTERVALO_MS = 15000; 

function Indicador({ titulo, valor, detalhe, destino }) {
  return (
    <a className="indicadores__item" href={destino}>
      <span className="indicadores__titulo">{titulo}</span>
      <strong className="indicadores__valor">{valor}</strong>
      <span className="indicadores__detalhe">{detalhe}</span>
    </a>
  );
}

function ListaChamados({ chamados }) {
  if (chamados.length === 0) return <p className="vazio">Nenhum chamado ainda.</p>;
  return (
    <ul className="lista">
      {chamados.map((c) => (
        <li key={c.id}>
          <a href={`#/chamados/${c.id}`}>{`${numeroChamado(c.id)} · ${c.imovel_codigo} · ${rotulo(c.categoria)}`}</a>
          <span className="lista__direita"><Badge valor={c.status} /></span>
        </li>
      ))}
    </ul>
  );
}

function PainelEquipe({ d }) {
  return (
    <>
      <div className="indicadores">
        <Indicador titulo="Imóveis" valor={d.totais.imoveis} detalhe={`${d.imoveisDisponiveis} disponíveis`} destino="#/imoveis" />
        <Indicador titulo="Pessoas" valor={d.totais.pessoas} detalhe={`${d.usuariosAtivos} com acesso ativo`} destino="#/pessoas" />
        <Indicador titulo="Contratos" valor={d.totais.contratos} detalhe={`${d.contratosAtivos} ativos`} destino="#/contratos" />
        <Indicador titulo="Vistorias" valor={d.totais.vistorias} detalhe={`${d.vistoriasPorStatus.agendada} agendadas`} destino="#/vistorias" />
        <Indicador titulo="Chamados" valor={d.totais.chamados} detalhe={`${d.chamadosSemResponsavel} sem responsável`} destino="#/chamados" />
      </div>
      <div className="cartoes">
        <Cartao titulo="Chamados por situação"><Barras dados={d.chamadosPorStatus} ordem={['aberto', 'em_analise', 'em_execucao', 'concluido']} /></Cartao>
        <Cartao titulo="Chamados por urgência"><Barras dados={d.chamadosPorUrgencia} ordem={['alta', 'media', 'baixa']} /></Cartao>
        <Cartao titulo="Pessoas por tipo"><Barras dados={d.pessoasPorTipo} ordem={['funcionario', 'proprietario', 'inquilino']} /></Cartao>
        <Cartao titulo="Próximas vistorias">
          {d.proximasVistorias.length === 0 ? <p className="vazio">Nenhuma vistoria agendada.</p> : (
            <ul className="lista">
              {d.proximasVistorias.map((v) => (
                <li key={v.id}>
                  <a href={`#/vistorias/${v.id}`}>{`${dataBR(v.data)} ${v.horario} · ${v.imovel_codigo}`}</a>
                  <span className="lista__direita">{`${rotulo(v.tipo)} — ${v.cliente_nome}`}</span>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
        <Cartao titulo="Últimos chamados"><ListaChamados chamados={d.ultimosChamados} /></Cartao>
      </div>
    </>
  );
}

function PainelCliente({ d }) {
  const s = d.chamadosPorStatus;
  return (
    <>
      <div className="indicadores">
        <Indicador titulo="Meus chamados" valor={d.totais.chamados} detalhe="no total" destino="#/chamados" />
        <Indicador titulo="Em andamento" valor={s.em_analise + s.em_execucao} detalhe="em análise ou execução" destino="#/chamados" />
        <Indicador titulo="Concluídos" valor={s.concluido} detalhe="resolvidos" destino="#/chamados" />
      </div>
      <div className="cartoes">
        <Cartao titulo="Chamados por situação"><Barras dados={s} ordem={['aberto', 'em_analise', 'em_execucao', 'concluido']} /></Cartao>
        <Cartao titulo="Últimos chamados">
          {d.ultimosChamados.length === 0 ? <p className="vazio">Você ainda não abriu nenhum chamado.</p> : <ListaChamados chamados={d.ultimosChamados} />}
        </Cartao>
      </div>
    </>
  );
}

export default function Dashboard() {
  const { usuario } = useAuth();
  const equipe = usuario.tipo === 'funcionario';
  // useFetch com "intervalo" busca ao abrir a tela e depois a cada 15 s (o timer é limpo ao sair da tela)
  const { dados, erro, carregando, recarregar, atualizadoEm } = useFetch('/dashboard', null, { intervalo: INTERVALO_MS });

  return (
    <>
      <header className="pagina__cabecalho">
        <div>
          <h1>{equipe ? 'Dashboard' : `Olá, ${usuario.nome.split(' ')[0]}`}</h1>
          <p className="subtitulo">{equipe ? 'Visão geral da operação da imobiliária.' : 'Resumo dos seus chamados de manutenção.'}</p>
        </div>
        <div className="atualizacao">
          <span className="atualizacao__horario">
            {erro && dados ? 'Sem conexão — tentando novamente…' : atualizadoEm && `Atualizado às ${atualizadoEm.toLocaleTimeString('pt-BR')}`}
          </span>
          <button type="button" className="botao botao--secundario botao--pequeno" onClick={recarregar}>Atualizar agora</button>
        </div>
      </header>

      <div aria-live="polite">
        {carregando && <Carregando />}
        {erro && !dados && <EstadoErro erro={erro} aoTentarNovamente={recarregar} />}
        {dados && (dados.perfil === 'equipe' ? <PainelEquipe d={dados} /> : <PainelCliente d={dados} />)}
      </div>
    </>
  );
}
