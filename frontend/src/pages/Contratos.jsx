import CrudLista from '../components/CrudLista.jsx';
import Badge from '../components/Badge.jsx';
import { api } from '../services/api.js';
import { dataBR, moeda } from '../utils/formatacao.js';
import { opcoesDe, rotulo } from '../utils/rotulos.js';

const CONFIG = {
  titulo: 'Contratos',
  subtitulo: 'Vincule o imóvel às pessoas envolvidas. Imóvel e pessoas precisam estar cadastrados. O proprietário é o do imóvel escolhido.',
  endpoint: '/contratos',
  rotuloNovo: 'Novo contrato',
  buscaPlaceholder: 'Número, imóvel, proprietário ou inquilino',
  nomeItem: (c) => `o contrato ${c.numero}`,
  ordenarPadrao: 'numero',
  colunas: [
    { rotulo: 'Número', campo: 'numero', ordenar: 'numero' },
    { rotulo: 'Tipo', ordenar: 'tipo', formatar: (c) => rotulo(c.tipo) },
    { rotulo: 'Imóvel', campo: 'imovel_codigo', ordenar: 'imovel' },
    { rotulo: 'Proprietário', campo: 'proprietario_nome' },
    { rotulo: 'Inquilino', campo: 'inquilino_nome', ordenar: 'inquilino' },
    { rotulo: 'Início', ordenar: 'data_inicio', formatar: (c) => dataBR(c.data_inicio) },
    { rotulo: 'Fim', ordenar: 'data_fim', formatar: (c) => dataBR(c.data_fim) },
    { rotulo: 'Valor', ordenar: 'valor', formatar: (c) => moeda(c.valor) },
    { rotulo: 'Situação', ordenar: 'situacao', formatar: (c) => <Badge valor={c.situacao} /> },
  ],
  filtros: [
    { nome: 'tipo', rotulo: 'Tipo', opcoes: opcoesDe('locacao', 'venda') },
    { nome: 'situacao', rotulo: 'Situação', opcoes: opcoesDe('ativo', 'encerrado') },
  ],
  campos: [
    { nome: 'numero', rotulo: 'Número do contrato', obrigatorio: true, max: 30, placeholder: 'CT-2026-0003' },
    { nome: 'tipo', rotulo: 'Tipo', tipo: 'select', obrigatorio: true, opcoes: opcoesDe('locacao', 'venda') },
    { nome: 'situacao', rotulo: 'Situação', tipo: 'select', obrigatorio: true, valorInicial: 'ativo', opcoes: opcoesDe('ativo', 'encerrado') },
    {
      nome: 'imovel_id', rotulo: 'Imóvel', tipo: 'select', obrigatorio: true,
      carregarOpcoes: async () => (await api('/imoveis', { params: { ordenar: 'codigo' } })).map((i) => [i.id, `${i.codigo} — ${i.endereco}`]),
    },
    {
      nome: 'inquilino_id', rotulo: 'Inquilino / comprador', tipo: 'select', obrigatorio: true,
      carregarOpcoes: async () => (await api('/pessoas', { params: { tipo: 'inquilino', ordenar: 'nome' } })).map((p) => [p.id, p.nome]),
    },
    { nome: 'valor', rotulo: 'Valor (R$)', tipo: 'number', obrigatorio: true, min: 0, step: '0.01' },
    { nome: 'data_inicio', rotulo: 'Data de início', tipo: 'date', obrigatorio: true },
    { nome: 'data_fim', rotulo: 'Data de fim', tipo: 'date', obrigatorio: true },
  ],
};

export default function Contratos() {
  return <CrudLista config={CONFIG} />;
}
