import CrudLista from '../components/CrudLista.jsx';
import Badge from '../components/Badge.jsx';
import { api } from '../services/api.js';
import { moeda } from '../utils/formatacao.js';
import { opcoesDe, rotulo } from '../utils/rotulos.js';

const CATEGORIAS = ['Apartamento', 'Casa', 'Sala comercial', 'Terreno', 'Outro'].map((c) => [c, c]);
const DISPONIBILIDADE = [['true', 'Disponível'], ['false', 'Indisponível']];

const CONFIG = {
  titulo: 'Imóveis',
  subtitulo: 'Informe os dados do imóvel para disponibilizá-lo no sistema.',
  endpoint: '/imoveis',
  rotuloNovo: 'Novo imóvel',
  buscaPlaceholder: 'Código, endereço, categoria ou proprietário',
  nomeItem: (i) => `o imóvel ${i.codigo}`,
  ordenarPadrao: 'codigo',
  colunas: [
    { rotulo: 'Código', campo: 'codigo', ordenar: 'codigo' },
    { rotulo: 'Endereço', campo: 'endereco', ordenar: 'endereco' },
    { rotulo: 'Categoria', campo: 'categoria', ordenar: 'categoria' },
    { rotulo: 'Finalidade', ordenar: 'finalidade', formatar: (i) => rotulo(i.finalidade) },
    { rotulo: 'Valor', ordenar: 'valor', formatar: (i) => moeda(i.valor) },
    { rotulo: 'Proprietário', campo: 'proprietario_nome', ordenar: 'proprietario' },
    { rotulo: 'Disponibilidade', formatar: (i) => <Badge valor={i.disponivel ? 'disponivel' : 'indisponivel'} /> },
  ],
  filtros: [
    { nome: 'finalidade', rotulo: 'Finalidade', opcoes: opcoesDe('aluguel', 'venda') },
    { nome: 'disponivel', rotulo: 'Disponibilidade', opcoes: DISPONIBILIDADE },
  ],
  campos: [
    { nome: 'codigo', rotulo: 'Código', obrigatorio: true, max: 30, placeholder: 'Ex.: IMV-0103' },
    { nome: 'categoria', rotulo: 'Categoria', tipo: 'select', obrigatorio: true, opcoes: CATEGORIAS },
    { nome: 'finalidade', rotulo: 'Finalidade', tipo: 'select', obrigatorio: true, opcoes: opcoesDe('aluguel', 'venda') },
    { nome: 'endereco', rotulo: 'Endereço', obrigatorio: true, max: 200, tamanho: 'inteira', placeholder: 'Rua, número, bairro, cidade' },
    { nome: 'valor', rotulo: 'Valor de aluguel/venda (R$)', tipo: 'number', obrigatorio: true, min: 0, step: '0.01' },
    {
      nome: 'proprietario_id', rotulo: 'Proprietário', tipo: 'select', obrigatorio: true,
      carregarOpcoes: async () => (await api('/pessoas', { params: { tipo: 'proprietario', ordenar: 'nome' } })).map((p) => [p.id, p.nome]),
    },
    { nome: 'disponivel', rotulo: 'Disponibilidade', tipo: 'select', obrigatorio: true, valorInicial: 'true', opcoes: DISPONIBILIDADE },
  ],
};

export default function Imoveis() {
  return <CrudLista config={CONFIG} />;
}
