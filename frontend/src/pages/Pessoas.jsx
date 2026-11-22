import CrudLista from '../components/CrudLista.jsx';
import Badge from '../components/Badge.jsx';
import { documentoBR, telefoneBR } from '../utils/formatacao.js';
import { validarDocumento, validarTelefone } from '../utils/validacao.js';
import { opcoesDe } from '../utils/rotulos.js';

const TIPOS = opcoesDe('funcionario', 'proprietario', 'inquilino');

const CONFIG = {
  titulo: 'Pessoas',
  subtitulo: 'Cadastre proprietários, inquilinos e funcionários. O login e a senha criados aqui são usados para acessar o sistema.',
  endpoint: '/pessoas',
  rotuloNovo: 'Nova pessoa',
  buscaPlaceholder: 'Nome, CPF/CNPJ, usuário ou e-mail',
  nomeItem: (p) => p.nome,
  ordenarPadrao: 'nome',
  colunas: [
    { rotulo: 'Nome', campo: 'nome', ordenar: 'nome' },
    { rotulo: 'CPF/CNPJ', ordenar: 'cpf_cnpj', formatar: (p) => documentoBR(p.cpf_cnpj) },
    { rotulo: 'Tipo', ordenar: 'tipo', formatar: (p) => <Badge valor={p.tipo} /> },
    { rotulo: 'Usuário', campo: 'usuario', ordenar: 'usuario' },
    { rotulo: 'Contato', formatar: (p) => [telefoneBR(p.telefone), p.email].filter(Boolean).join(' · ') || '—' },
    { rotulo: 'Situação', formatar: (p) => <Badge valor={p.ativo ? 'ativo' : 'inativo'} /> },
  ],
  filtros: [{ nome: 'tipo', rotulo: 'Tipo', opcoes: TIPOS }],
  campos: [
    { nome: 'nome', rotulo: 'Nome completo', obrigatorio: true, max: 120, placeholder: 'Digite o nome' },
    { nome: 'cpf_cnpj', rotulo: 'CPF/CNPJ', obrigatorio: true, max: 14, somenteDigitos: true, validar: validarDocumento, placeholder: 'Somente números', dica: 'CPF (11 dígitos) ou CNPJ (14 dígitos), sem pontos e traços.' },
    { nome: 'tipo', rotulo: 'Tipo', tipo: 'select', obrigatorio: true, opcoes: TIPOS },
    { nome: 'telefone', rotulo: 'Telefone', max: 11, somenteDigitos: true, validar: validarTelefone, placeholder: 'DDD + número, só números', dica: 'Até 11 dígitos. Ex.: 49999990000' },
    { nome: 'email', rotulo: 'E-mail', tipo: 'email', max: 120, placeholder: 'nome@email.com' },
    { nome: 'endereco', rotulo: 'Endereço', max: 200, tamanho: 'inteira', placeholder: 'Rua, número, bairro, cidade' },
    { nome: 'usuario', rotulo: 'Usuário (login)', obrigatorio: true, max: 40, placeholder: 'Defina o usuário' },
    { nome: 'senha', rotulo: 'Senha', tipo: 'password', obrigatorio: true, soCriar: true, max: 72, dica: 'Mínimo de 8 caracteres.', dicaEdicao: 'Deixe em branco para manter a senha atual.' },
    { nome: 'ativo', rotulo: 'Acesso ativo', tipo: 'checkbox' },
  ],
};

export default function Pessoas() {
  return <CrudLista config={CONFIG} />;
}
