const { Op } = require("sequelize");
const { Imovel, Pessoa, Contrato } = require("../database/models");
const { montarOrdem } = require("../utils/ordenacao");
const { termoLike } = require("../utils/busca");

const incluirProprietario = { model: Pessoa, as: "proprietario", attributes: ["id", "nome"] };

const ORDENAVEIS = {
    codigo: ["codigo"],
    endereco: ["endereco"],
    categoria: ["categoria"],
    finalidade: ["finalidade"],
    valor: ["valor"],
    proprietario: [{ model: Pessoa, as: "proprietario" }, "nome"],
};

const listar = ({ busca, finalidade, disponivel, ordenar, direcao } = {}) => {
    const where = {};
    if (busca) {
        const b = termoLike(busca);
        where[Op.or] = [
            { codigo: { [Op.iLike]: b } },
            { endereco: { [Op.iLike]: b } },
            { categoria: { [Op.iLike]: b } },
            { "$proprietario.nome$": { [Op.iLike]: b } },
        ];
    }
    if (finalidade) where.finalidade = finalidade;
    if (disponivel === "true" || disponivel === "false") where.disponivel = disponivel === "true";
    return Imovel.findAll({ where, include: incluirProprietario, order: montarOrdem(ORDENAVEIS, ordenar, direcao, "codigo") });
};

const buscarPorId = (id) => Imovel.findByPk(id, { include: incluirProprietario });
const criar = (campos) => Imovel.create(campos);
const atualizar = (id, campos) => Imovel.update(campos, { where: { id } });
const excluir = (id) => Imovel.destroy({ where: { id } });

// Imóveis em que o cliente pode abrir chamado: é o proprietário OU tem contrato ativo.
const listarDoCliente = async (pessoaId) => {
    const contratos = await Contrato.findAll({ where: { inquilino_id: pessoaId, situacao: "ativo" }, attributes: ["imovel_id"] });
    const idsAlugados = contratos.map((c) => c.imovel_id);
    return Imovel.findAll({
        where: { [Op.or]: [{ proprietario_id: pessoaId }, { id: { [Op.in]: idsAlugados } }] },
        attributes: ["id", "codigo", "endereco"],
        order: [["codigo", "ASC"]],
    });
};

// Mantém "disponivel" coerente com os contratos ativos do imóvel.
const sincronizarDisponibilidade = async (imovelId) => {
    const ativos = await Contrato.count({ where: { imovel_id: imovelId, situacao: "ativo" } });
    await Imovel.update({ disponivel: ativos === 0 }, { where: { id: imovelId } });
};

module.exports = { listar, buscarPorId, criar, atualizar, excluir, listarDoCliente, sincronizarDisponibilidade };
