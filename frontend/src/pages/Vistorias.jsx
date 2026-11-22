import CrudLista from '../components/CrudLista.jsx';
import Badge from '../components/Badge.jsx';
import { api } from '../services/api.js';
import { irPara } from '../hooks/useHashRoute.js';
import { dataBR } from '../utils/formatacao.js';
import { opcoesDe, rotulo } from '../utils/rotulos.js';

const CONFIG = {
  titulo: 'Vistorias',
  subtitulo: 'Agende vistorias de entrada, saída ou final. Os dados do imóvel e das pessoas vêm do cadastro.',
  endpoint: '/vistorias',
  rotuloNovo: 'Agendar vistoria',
  buscaPlaceholder: 'Imóvel, endereço, cliente ou responsável',
  nomeItem: (v) => `a vistoria de ${v.imovel_codigo} em ${dataBR(v.data)}`,
  ordenarPadrao: 'data',
  direcaoPadrao: 'desc',
  colunas: [
    { rotulo: 'Data', ordenar: 'data', formatar: (v) => `${dataBR(v.data)} ${v.horario}` },
    { rotulo: 'Tipo', ordenar: 'tipo', formatar: (v) => rotulo(v.tipo) },
    { rotulo: 'Imóvel', campo: 'imovel_codigo', ordenar: 'imovel' },
    { rotulo: 'Cliente', campo: 'cliente_nome', ordenar: 'cliente' },
    { rotulo: 'Responsável', campo: 'responsavel_nome', ordenar: 'responsavel' },
    { rotulo: 'Situação', ordenar: 'status', formatar: (v) => <Badge valor={v.status} /> },
    { rotulo: 'Conclusão', formatar: (v) => (v.conclusao ? <Badge valor={v.conclusao} /> : '—') },
  ],
  filtros: [
    { nome: 'tipo', rotulo: 'Tipo', opcoes: opcoesDe('entrada', 'saida', 'final') },
    { nome: 'status', rotulo: 'Situação', opcoes: opcoesDe('agendada', 'realizada') },
  ],
  acoes: [{ rotulo: 'Abrir', aoClicar: (v) => irPara(`#/vistorias/${v.id}`) }],
  campos: [
    {
      nome: 'imovel_id', rotulo: 'Imóvel', tipo: 'select', obrigatorio: true,
      carregarOpcoes: async () => (await api('/imoveis', { params: { ordenar: 'codigo' } })).map((i) => [i.id, `${i.codigo} — ${i.endereco}`]),
    },
    { nome: 'tipo', rotulo: 'Tipo de vistoria', tipo: 'select', obrigatorio: true, valorInicial: 'entrada', opcoes: opcoesDe('entrada', 'saida', 'final') },
    { nome: 'data', rotulo: 'Data', tipo: 'date', obrigatorio: true },
    { nome: 'horario', rotulo: 'Horário', tipo: 'time', obrigatorio: true },
    {
      nome: 'responsavel_id', rotulo: 'Responsável', tipo: 'select', obrigatorio: true,
      carregarOpcoes: async () => (await api('/pessoas', { params: { tipo: 'funcionario', ordenar: 'nome' } })).map((p) => [p.id, p.nome]),
    },
    {
      nome: 'cliente_id', rotulo: 'Inquilino/Proprietário', tipo: 'select', obrigatorio: true,
      carregarOpcoes: async () => (await api('/pessoas', { params: { ordenar: 'nome' } }))
        .filter((p) => p.tipo !== 'funcionario').map((p) => [p.id, `${p.nome} (${rotulo(p.tipo)})`]),
    },
    { nome: 'observacoes', rotulo: 'Observações', tipo: 'textarea', max: 500, tamanho: 'inteira', placeholder: 'Escreva observações sobre a vistoria' },
  ],
};

export default function Vistorias() {
  return <CrudLista config={CONFIG} />;
}
