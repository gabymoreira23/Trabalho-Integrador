const repository = require("./imoveis.repository");
const pessoasRepository = require("../pessoas/pessoas.repository");
const v = require("../utils/validacao");
const { AppError, naoEncontrado } = require("../utils/erros");

// Achata o objeto: { proprietario: { nome } } -> { proprietario_nome }
function formatar(imovel) {
    const { proprietario, ...resto } = imovel.toJSON();
    return { ...resto, proprietario_nome: proprietario ? proprietario.nome : null };
}

async function validar(d) {
    const proprietarioId = v.id(d.proprietario_id, "Proprietário");
    const dono = await pessoasRepository.buscarPorId(proprietarioId);
    if (!dono || dono.tipo !== "proprietario") throw new AppError(400, "Selecione um proprietário válido.");
    return {
        codigo: v.texto(d.codigo, "Código", { max: 30 }),
        endereco: v.texto(d.endereco, "Endereço", { min: 5, max: 200 }),
        categoria: v.texto(d.categoria, "Categoria", { max: 50 }),
        finalidade: v.opcao(d.finalidade, "Finalidade", ["aluguel", "venda"]),
        valor: v.numero(d.valor, "Valor"),
        disponivel: v.booleano(d.disponivel, true),
        proprietario_id: proprietarioId,
    };
}

const listar = async (filtros) => (await repository.listar(filtros)).map(formatar);

async function buscar(id) {
    const imovel = await repository.buscarPorId(v.id(id, "Id"));
    if (!imovel) throw naoEncontrado("Imóvel");
    return formatar(imovel);
}

async function criar(dados) {
    const novo = await repository.criar(await validar(dados));
    return buscar(novo.id);
}

async function atualizar(id, dados) {
    await buscar(id);
    await repository.atualizar(Number(id), await validar(dados));
    return buscar(id);
}

async function excluir(id) {
    await buscar(id);
    await repository.excluir(Number(id));
}

module.exports = { listar, buscar, criar, atualizar, excluir };
