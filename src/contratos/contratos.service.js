const repository = require("./contratos.repository");
const imoveisRepository = require("../imoveis/imoveis.repository");
const pessoasRepository = require("../pessoas/pessoas.repository");
const v = require("../utils/validacao");
const { AppError, naoEncontrado } = require("../utils/erros");

function formatar(contrato) {
    const { imovel, proprietario, inquilino, ...resto } = contrato.toJSON();
    return {
        ...resto,
        imovel_codigo: imovel && imovel.codigo,
        imovel_endereco: imovel && imovel.endereco,
        proprietario_nome: proprietario && proprietario.nome,
        inquilino_nome: inquilino && inquilino.nome,
    };
}

async function validar(d) {
    const imovel = await imoveisRepository.buscarPorId(v.id(d.imovel_id, "Imóvel"));
    if (!imovel) throw new AppError(400, "Selecione um imóvel válido.");
    const inquilinoId = v.id(d.inquilino_id, "Inquilino");
    const inquilino = await pessoasRepository.buscarPorId(inquilinoId);
    if (!inquilino || inquilino.tipo !== "inquilino") throw new AppError(400, "Selecione um inquilino válido.");
    const inicio = v.data(d.data_inicio, "Data de início");
    const fim = v.data(d.data_fim, "Data de fim");
    if (fim < inicio) throw new AppError(400, "A data de fim não pode ser anterior à data de início.");
    return {
        numero: v.texto(d.numero, "Número do contrato", { max: 30 }),
        tipo: v.opcao(d.tipo, "Tipo", ["locacao", "venda"]),
        situacao: v.opcao(d.situacao, "Situação", ["ativo", "encerrado"]),
        imovel_id: imovel.id,
        proprietario_id: imovel.proprietario_id, // derivado do imóvel: evita contrato com dono errado
        inquilino_id: inquilinoId,
        data_inicio: inicio,
        data_fim: fim,
        valor: v.numero(d.valor, "Valor"),
    };
}

const listar = async (filtros) => (await repository.listar(filtros)).map(formatar);

async function buscarBruto(id) {
    const contrato = await repository.buscarPorId(v.id(id, "Id"));
    if (!contrato) throw naoEncontrado("Contrato");
    return contrato;
}
const buscar = async (id) => formatar(await buscarBruto(id));

async function criar(dados) {
    const campos = await validar(dados);
    const novo = await repository.criar(campos);
    await imoveisRepository.sincronizarDisponibilidade(campos.imovel_id);
    return buscar(novo.id);
}

async function atualizar(id, dados) {
    const antigo = await buscarBruto(id);
    const campos = await validar(dados);
    await repository.atualizar(Number(id), campos);
    await imoveisRepository.sincronizarDisponibilidade(antigo.imovel_id);
    await imoveisRepository.sincronizarDisponibilidade(campos.imovel_id);
    return buscar(id);
}

async function excluir(id) {
    const antigo = await buscarBruto(id);
    await repository.excluir(Number(id));
    await imoveisRepository.sincronizarDisponibilidade(antigo.imovel_id);
}

module.exports = { listar, buscar, criar, atualizar, excluir };
