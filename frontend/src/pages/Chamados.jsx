import { useMemo } from 'react';
import CrudLista from '../components/CrudLista.jsx';
import Badge from '../components/Badge.jsx';
import { api } from '../services/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { irPara } from '../hooks/useHashRoute.js';
import { dataBR, dataHoraBR, numeroChamado } from '../utils/formatacao.js';
import { opcoesDe, rotulo } from '../utils/rotulos.js';

const CATEGORIAS = opcoesDe('hidraulica', 'eletrica', 'estrutura', 'outros');
const NIVEIS = opcoesDe('baixa', 'media', 'alta');
const abrir = (c) => irPara(`#/chamados/${c.id}`);
const opcoesImoveis = async () => (await api('/chamados/imoveis')).map((i) => [i.id, `${i.codigo} — ${i.endereco}`]);

const COLUNAS_EQUIPE = [
  { rotulo: 'Chamado', ordenar: 'id', formatar: (c) => numeroChamado(c.id) },
  { rotulo: 'Imóvel', campo: 'imovel_codigo', ordenar: 'imovel' },
  { rotulo: 'Solicitante', campo: 'solicitante_nome', ordenar: 'solicitante' },
  { rotulo: 'Categoria', ordenar: 'categoria', formatar: (c) => rotulo(c.categoria) },
  { rotulo: 'Urgência', ordenar: 'urgencia', formatar: (c) => <Badge valor={c.urgencia} /> },
  { rotulo: 'Situação', ordenar: 'status', formatar: (c) => <Badge valor={c.status} /> },
  { rotulo: 'Responsável', formatar: (c) => c.responsavel_nome || 'Não atribuído' },
  { rotulo: 'Prazo', ordenar: 'prazo', formatar: (c) => dataBR(c.prazo) },
  { rotulo: 'Aberto em', ordenar: 'criado_em', formatar: (c) => dataHoraBR(c.criado_em) },
];

const COLUNAS_CLIENTE = [
  { rotulo: 'Chamado', ordenar: 'id', formatar: (c) => numeroChamado(c.id) },
  { rotulo: 'Imóvel', campo: 'imovel_codigo', ordenar: 'imovel' },
  { rotulo: 'Categoria', ordenar: 'categoria', formatar: (c) => rotulo(c.categoria) },
  { rotulo: 'Urgência', ordenar: 'urgencia', formatar: (c) => <Badge valor={c.urgencia} /> },
  { rotulo: 'Situação', ordenar: 'status', formatar: (c) => <Badge valor={c.status} /> },
  { rotulo: 'Aberto em', ordenar: 'criado_em', formatar: (c) => dataHoraBR(c.criado_em) },
];

const CAMPOS_EQUIPE = [
  { nome: 'imovel_id', rotulo: 'Imóvel', tipo: 'select', obrigatorio: true, carregarOpcoes: opcoesImoveis },
  {
    nome: 'solicitante_id', rotulo: 'Solicitante', tipo: 'select', obrigatorio: true,
    carregarOpcoes: async () => (await api('/pessoas', { params: { ordenar: 'nome' } })).filter((p) => p.tipo !== 'funcionario').map((p) => [p.id, `${p.nome} (${rotulo(p.tipo)})`]),
  },
  { nome: 'categoria', rotulo: 'Categoria do problema', tipo: 'select', obrigatorio: true, opcoes: CATEGORIAS },
  { nome: 'urgencia', rotulo: 'Urgência', tipo: 'select', obrigatorio: true, valorInicial: 'media', opcoes: NIVEIS },
  { nome: 'canal', rotulo: 'Canal do pedido', tipo: 'select', obrigatorio: true, valorInicial: 'telefone', opcoes: opcoesDe('telefone', 'whatsapp', 'presencial') },
  { nome: 'descricao', rotulo: 'Descrição do problema', tipo: 'textarea', obrigatorio: true, max: 1000, tamanho: 'inteira', placeholder: 'Descreva o problema relatado' },
];

const CAMPOS_CLIENTE = [
  { nome: 'imovel_id', rotulo: 'Imóvel', tipo: 'select', obrigatorio: true, carregarOpcoes: opcoesImoveis },
  { nome: 'categoria', rotulo: 'Categoria do problema', tipo: 'select', obrigatorio: true, opcoes: CATEGORIAS },
  { nome: 'urgencia', rotulo: 'Urgência', tipo: 'select', obrigatorio: true, valorInicial: 'media', opcoes: NIVEIS },
  { nome: 'descricao', rotulo: 'Descrição', tipo: 'textarea', obrigatorio: true, max: 1000, tamanho: 'inteira', placeholder: 'Descreva o problema' },
];

// a tela muda conforme o perfil
function criarConfig(equipe) {
  return {
    titulo: equipe ? 'Chamados de manutenção' : 'Meus chamados',
    subtitulo: equipe
      ? 'Registre chamados em nome do cliente, classifique a prioridade e atribua um responsável com prazo.'
      : 'Conte o problema do imóvel e acompanhe o andamento. A equipe da imobiliária cuida do resto.',
    endpoint: '/chamados',
    rotuloNovo: equipe ? 'Registrar chamado' : 'Abrir chamado',
    buscaPlaceholder: equipe ? 'Número, descrição, imóvel ou solicitante' : 'Número, descrição ou imóvel',
    nomeItem: (c) => `o chamado ${numeroChamado(c.id)}`,
    ordenarPadrao: 'criado_em',
    direcaoPadrao: 'desc',
    colunas: equipe ? COLUNAS_EQUIPE : COLUNAS_CLIENTE,
    filtros: [
      { nome: 'status', rotulo: 'Situação', opcoes: opcoesDe('aberto', 'em_analise', 'em_execucao', 'concluido') },
      { nome: 'urgencia', rotulo: 'Urgência', opcoes: NIVEIS },
      { nome: 'categoria', rotulo: 'Categoria', opcoes: CATEGORIAS },
    ],
    campos: equipe ? CAMPOS_EQUIPE : CAMPOS_CLIENTE,
    editar: false, 
    excluir: equipe,
    acoes: [{ rotulo: equipe ? 'Tratar' : 'Acompanhar', aoClicar: abrir }],
  };
}

export default function Chamados() {
  const { usuario } = useAuth();
  const equipe = usuario.tipo === 'funcionario';
  const config = useMemo(() => criarConfig(equipe), [equipe]); 
  return <CrudLista config={config} />;
}
