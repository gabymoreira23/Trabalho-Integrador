// textos exibidos para os valores guardados no banco 
const ROTULOS = {
  funcionario: 'Funcionário', proprietario: 'Proprietário', inquilino: 'Inquilino',
  aluguel: 'Aluguel', venda: 'Venda', locacao: 'Locação', ativo: 'Ativo', encerrado: 'Encerrado', inativo: 'Inativo',
  entrada: 'Entrada', saida: 'Saída', final: 'Final', agendada: 'Agendada', realizada: 'Realizada',
  aprovada: 'Aprovada', com_pendencias: 'Com pendências',
  hidraulica: 'Hidráulica', eletrica: 'Elétrica', estrutura: 'Estrutura', outros: 'Outros',
  baixa: 'Baixa', media: 'Média', alta: 'Alta',
  aberto: 'Aberto', em_analise: 'Em análise', em_execucao: 'Em execução', concluido: 'Concluído',
  bom: 'Bom', regular: 'Regular', ruim: 'Ruim',
  sistema: 'Sistema', telefone: 'Telefone', whatsapp: 'WhatsApp', presencial: 'Presencial',
  disponivel: 'Disponível', indisponivel: 'Indisponível',
};

export const rotulo = (valor) => ROTULOS[valor] ?? valor ?? '—';

// opcoesDe('aberto', 'concluido') -> [['aberto', 'Aberto'], ['concluido', 'Concluído']]
export const opcoesDe = (...chaves) => chaves.map((c) => [c, rotulo(c)]);

// "Vistoria de entrada", "Vistoria de saída", "Vistoria final"
export const tituloVistoria = (tipo) => (tipo === 'final' ? 'Vistoria final' : `Vistoria de ${rotulo(tipo).toLowerCase()}`);
