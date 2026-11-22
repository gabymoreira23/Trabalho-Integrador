import { useRef, useState } from 'react';
import { api } from '../services/api.js';
import { useToast } from '../contexts/ToastContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { useFormulario } from '../hooks/useFormulario.js';
import Cartao from '../components/Cartao.jsx';
import Campo from '../components/Campo.jsx';
import Badge from '../components/Badge.jsx';
import Carregando from '../components/Carregando.jsx';
import EstadoErro from '../components/EstadoErro.jsx';
import { dataBR, dataHoraBR, hojeISO, moeda } from '../utils/formatacao.js';
import { opcoesDe, rotulo, tituloVistoria } from '../utils/rotulos.js';

// gera uma chave estável para cada linha das listas editáveis (checklist/orçamento).
let contadorChaves = 0;
const novaChave = () => { contadorChaves += 1; return contadorChaves; };

const alterarLinha = (linhas, n, mudancas) => linhas.map((l, i) => (i === n ? { ...l, ...mudancas } : l));

function DadosVistoria({ v }) {
  return (
    <Cartao titulo="Dados da vistoria">
      <dl className="detalhes">
        <div><dt>Imóvel</dt><dd>{`${v.imovel_codigo} — ${v.imovel_endereco}`}</dd></div>
        <div><dt>Tipo</dt><dd>{rotulo(v.tipo)}</dd></div>
        <div><dt>Data e horário</dt><dd>{`${dataBR(v.data)} às ${v.horario}`}</dd></div>
        <div><dt>Responsável</dt><dd>{v.responsavel_nome}</dd></div>
        <div><dt>Inquilino/Proprietário</dt><dd>{v.cliente_nome}</dd></div>
        {v.observacoes && <div className="detalhes__item--inteiro"><dt>Observações</dt><dd>{v.observacoes}</dd></div>}
      </dl>
    </Cartao>
  );
}

function CartaoChecklist({ v, aoSalvar }) {
  const { mostrar } = useToast();
  const [linhas, setLinhas] = useState(() => v.itens.map((i) => ({ chave: novaChave(), comodo_item: i.comodo_item, estado: i.estado, observacoes: i.observacoes || '' })));
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    try {
      await api(`/vistorias/${v.id}/checklist`, { metodo: 'PUT', corpo: { itens: linhas } });
      mostrar('Checklist salvo.');
      aoSalvar();
    } catch (e) {
      mostrar(e.message, 'erro');
      setSalvando(false);
    }
  }

  return (
    <Cartao titulo="Checklist — estado de conservação por cômodo">
      <div className="linhas">
        {linhas.length === 0 && <p className="vazio">Nenhum item ainda. Adicione os cômodos e itens vistoriados.</p>}
        {linhas.map((l, n) => (
          <div key={l.chave} className="linhas__linha linhas__linha--checklist">
            <input type="text" aria-label={`Cômodo/item ${n + 1}`} placeholder="Ex.: Sala - Paredes" maxLength={100}
              value={l.comodo_item} onChange={(e) => setLinhas(alterarLinha(linhas, n, { comodo_item: e.target.value }))} />
            <select aria-label={`Estado de conservação ${n + 1}`} value={l.estado}
              onChange={(e) => setLinhas(alterarLinha(linhas, n, { estado: e.target.value }))}>
              {opcoesDe('bom', 'regular', 'ruim').map(([val, r]) => <option key={val} value={val}>{r}</option>)}
            </select>
            <input type="text" aria-label={`Observações ${n + 1}`} placeholder="Observações" maxLength={300}
              value={l.observacoes} onChange={(e) => setLinhas(alterarLinha(linhas, n, { observacoes: e.target.value }))} />
            <button type="button" className="botao botao--pequeno botao--perigo-secundario"
              onClick={() => setLinhas(linhas.filter((_, i) => i !== n))}>Remover</button>
          </div>
        ))}
      </div>
      <div className="botoes">
        <button type="button" className="botao botao--secundario"
          onClick={() => setLinhas([...linhas, { chave: novaChave(), comodo_item: '', estado: 'bom', observacoes: '' }])}>Adicionar item</button>
        <button type="button" className="botao" disabled={salvando} onClick={salvar}>Salvar checklist</button>
      </div>
    </Cartao>
  );
}

function CartaoParecer({ v, aoSalvar }) {
  const { mostrar } = useToast();
  const realizada = v.status === 'realizada';
  const semChecklist = v.itens.length === 0;
  const { valores, handleChange } = useFormulario({
    parecer_data: v.parecer_data || hojeISO(),
    conclusao: v.conclusao || '',
    pendencias: v.pendencias || '',
    parecer_obs: v.parecer_obs || '',
  });
  const [salvando, setSalvando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      await api(`/vistorias/${v.id}/parecer`, { metodo: 'PUT', corpo: valores });
      mostrar('Parecer registrado.');
      aoSalvar();
    } catch (e2) {
      mostrar(e2.message, 'erro');
      setSalvando(false);
    }
  }

  return (
    <Cartao titulo="Parecer da vistoria">
      {realizada && <p>Situação: <Badge valor={v.conclusao} /></p>}
      <form className="formulario" onSubmit={enviar}>
        <Campo rotulo="Data"><input type="date" name="parecer_data" value={valores.parecer_data} onChange={handleChange} /></Campo>
        <Campo rotulo="Responsável"><input type="text" value={v.responsavel_nome} readOnly /></Campo>
        <Campo rotulo="Conclusão">
          <select name="conclusao" required value={valores.conclusao} onChange={handleChange}>
            <option value="">Selecione…</option>
            {opcoesDe('aprovada', 'com_pendencias').map(([val, r]) => <option key={val} value={val}>{r}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Pendências encontradas" inteira dica='Obrigatório quando a conclusão for "Com pendências".'>
          <textarea name="pendencias" rows={3} maxLength={1000} placeholder="Descreva as pendências" value={valores.pendencias} onChange={handleChange} />
        </Campo>
        <Campo rotulo="Observações" inteira>
          <textarea name="parecer_obs" rows={2} maxLength={500} value={valores.parecer_obs} onChange={handleChange} />
        </Campo>
        {semChecklist && <p className="dica campo--inteiro">Salve ao menos um item no checklist antes de registrar o parecer.</p>}
        <div className="botoes campo--inteiro">
          <button type="submit" className="botao" disabled={semChecklist || salvando}>{realizada ? 'Atualizar parecer' : 'Registrar parecer'}</button>
        </div>
      </form>
    </Cartao>
  );
}

function CartaoOrcamento({ v, aoSalvar }) {
  const { mostrar } = useToast();
  const liberado = v.status === 'realizada';
  const [linhas, setLinhas] = useState(() => v.reparos.map((r) => ({ chave: novaChave(), item: r.item, descricao: r.descricao || '', valor: String(r.valor) })));
  const [salvando, setSalvando] = useState(false);
  // o total é calculado a partir das linhas a cada renderização 
  const total = linhas.reduce((soma, l) => soma + (Number(l.valor) || 0), 0);

  async function salvar() {
    setSalvando(true);
    try {
      await api(`/vistorias/${v.id}/orcamento`, { metodo: 'PUT', corpo: { reparos: linhas } });
      mostrar('Orçamento salvo.');
      aoSalvar();
    } catch (e) {
      mostrar(e.message, 'erro');
      setSalvando(false);
    }
  }

  return (
    <Cartao titulo="Orçamento de reparos">
      {!liberado && <p className="dica">Registre o parecer para liberar o orçamento.</p>}
      <div className="linhas">
        {linhas.length === 0 && <p className="vazio">Nenhum reparo lançado.</p>}
        {linhas.map((l, n) => (
          <div key={l.chave} className="linhas__linha linhas__linha--orcamento">
            <input type="text" aria-label={`Item ${n + 1}`} placeholder="Item" maxLength={100} value={l.item}
              onChange={(e) => setLinhas(alterarLinha(linhas, n, { item: e.target.value }))} />
            <input type="text" aria-label={`Descrição ${n + 1}`} placeholder="Descrição" maxLength={300} value={l.descricao}
              onChange={(e) => setLinhas(alterarLinha(linhas, n, { descricao: e.target.value }))} />
            <input type="number" aria-label={`Valor ${n + 1}`} placeholder="R$ 0,00" min={0} step="0.01" value={l.valor}
              onChange={(e) => setLinhas(alterarLinha(linhas, n, { valor: e.target.value }))} />
            <button type="button" className="botao botao--pequeno botao--perigo-secundario"
              onClick={() => setLinhas(linhas.filter((_, i) => i !== n))}>Remover</button>
          </div>
        ))}
      </div>
      <div className="orcamento__rodape">
        <button type="button" className="botao botao--secundario" disabled={!liberado}
          onClick={() => setLinhas([...linhas, { chave: novaChave(), item: '', descricao: '', valor: '' }])}>Adicionar reparo</button>
        <span>Total do orçamento: <strong className="orcamento__total">{moeda(total)}</strong></span>
        <button type="button" className="botao" disabled={!liberado || salvando} onClick={salvar}>Salvar orçamento</button>
      </div>
    </Cartao>
  );
}


function PainelAssinatura({ titulo, existente, nome, aoMudarNome, habilitado, aoDesenhar }) {
  const canvasRef = useRef(null);
  const desenhando = useRef(false);

  const ponto = (e) => {
    const canvas = canvasRef.current;
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * (canvas.width / r.width), (e.clientY - r.top) * (canvas.height / r.height)];
  };

  function comecar(e) {
    if (!habilitado) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#0e1c47';
    desenhando.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    ctx.beginPath();
    ctx.moveTo(...ponto(e));
  }
  function mover(e) {
    if (!desenhando.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(...ponto(e));
    ctx.stroke();
  }
  function terminar() {
    if (!desenhando.current) return;
    desenhando.current = false;
    aoDesenhar(canvasRef.current.toDataURL('image/png'));
  }
  function limpar() {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    aoDesenhar(null);
  }

  return (
    <div className="assinatura">
      <h3>{titulo}</h3>
      {existente && (
        <div className="assinatura__atual">
          <img src={existente.imagem} alt={`Assinatura registrada de ${existente.nome}`} />
          <small>{`Registrada em ${dataHoraBR(existente.assinado_em)}`}</small>
        </div>
      )}
      <div className="assinatura__area">
        <canvas ref={canvasRef} className="assinatura__canvas" width={600} height={200}
          aria-label={`Área para desenhar a assinatura de ${titulo}`}
          onPointerDown={comecar} onPointerMove={mover} onPointerUp={terminar} onPointerCancel={terminar} />
      </div>
      <p className="dica">Assine aqui com o dedo ou com o mouse.</p>
      <Campo rotulo="Nome">
        <input type="text" value={nome} maxLength={120} readOnly={!habilitado} onChange={(e) => aoMudarNome(e.target.value)} />
      </Campo>
      <button type="button" className="botao botao--pequeno botao--secundario" onClick={limpar}>Limpar</button>
    </div>
  );
}

function CartaoAssinaturas({ v, aoSalvar }) {
  const { mostrar } = useToast();
  const realizada = v.status === 'realizada';
  const existente = (papel) => v.assinaturas.find((a) => a.papel === papel);
  const [nomes, setNomes] = useState({
    responsavel: existente('responsavel')?.nome || v.responsavel_nome,
    cliente: existente('cliente')?.nome || v.cliente_nome,
  });
  const [imagens, setImagens] = useState({ responsavel: null, cliente: null }); // null = ainda não desenhou
  const [salvando, setSalvando] = useState(false);

  async function confirmar() {
    const papeis = ['responsavel', 'cliente'].filter((p) => imagens[p]);
    if (papeis.length === 0) { mostrar('Desenhe ao menos uma assinatura para confirmar.', 'erro'); return; }
    setSalvando(true);
    try {
      for (const papel of papeis) {
        await api(`/vistorias/${v.id}/assinatura`, { metodo: 'PUT', corpo: { papel, nome: nomes[papel], imagem: imagens[papel] } });
      }
      mostrar('Assinaturas registradas.');
      aoSalvar();
    } catch (e) {
      mostrar(e.message, 'erro');
      setSalvando(false);
    }
  }

  return (
    <Cartao titulo="Assinatura das partes">
      <p className="subtitulo">Assinatura simples, desenhada na tela. Não exige validade jurídica.</p>
      {!realizada && <p className="dica">Registre o parecer para liberar as assinaturas.</p>}
      <div className="assinaturas">
        <PainelAssinatura titulo="Responsável pela vistoria" existente={existente('responsavel')} nome={nomes.responsavel} habilitado={realizada}
          aoMudarNome={(n) => setNomes((x) => ({ ...x, responsavel: n }))} aoDesenhar={(img) => setImagens((x) => ({ ...x, responsavel: img }))} />
        <PainelAssinatura titulo="Cliente (inquilino ou proprietário)" existente={existente('cliente')} nome={nomes.cliente} habilitado={realizada}
          aoMudarNome={(n) => setNomes((x) => ({ ...x, cliente: n }))} aoDesenhar={(img) => setImagens((x) => ({ ...x, cliente: img }))} />
      </div>
      <div className="botoes">
        <button type="button" className="botao" disabled={!realizada || salvando} onClick={confirmar}>Confirmar assinaturas</button>
      </div>
    </Cartao>
  );
}

function CartaoLaudo({ v }) {
  const pronto = v.status === 'realizada' && v.assinaturas.some((a) => a.papel === 'responsavel') && v.assinaturas.some((a) => a.papel === 'cliente');
  return (
    <Cartao titulo="Laudo da vistoria">
      <p className="subtitulo">Reúne checklist, parecer, orçamento (quando houver) e assinaturas. Na janela de impressão, escolha "Salvar como PDF".</p>
      {pronto
        ? <a className="botao" href={`#/laudo/${v.id}`} target="_blank" rel="noopener noreferrer">Abrir laudo (PDF / imprimir)</a>
        : <p className="dica">O laudo fica disponível depois do parecer e das duas assinaturas.</p>}
    </Cartao>
  );
}

export default function VistoriaDetalhe({ id }) {
  const { dados: v, erro, carregando, recarregar, atualizadoEm } = useFetch(`/vistorias/${id}`);

  if (carregando) return <Carregando />;
  if (erro) return <EstadoErro erro={erro} aoTentarNovamente={recarregar} />;

  return (
    <>
      <header className="pagina__cabecalho">
        <div>
          <a className="pagina__voltar" href="#/vistorias">← Voltar para vistorias</a>
          <h1>{`${tituloVistoria(v.tipo)} — ${v.imovel_codigo}`}</h1>
          <p className="subtitulo">{`${dataBR(v.data)} às ${v.horario}`}</p>
        </div>
        <Badge valor={v.status} />
      </header>

      {/* "key" muda a cada busca os cartões são recriados com os dados salvos no servidor */}
      <div key={atualizadoEm?.getTime()}>
        <DadosVistoria v={v} />
        <CartaoChecklist v={v} aoSalvar={recarregar} />
        <CartaoParecer v={v} aoSalvar={recarregar} />
        {v.tipo === 'final' && <CartaoOrcamento v={v} aoSalvar={recarregar} />}
        <CartaoAssinaturas v={v} aoSalvar={recarregar} />
        <CartaoLaudo v={v} />
      </div>
    </>
  );
}
