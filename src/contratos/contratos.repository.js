const { Op } = require("sequelize");
const { Contrato, Imovel, Pessoa } = require("../database/models");
const { montarOrdem } = require("../utils/ordenacao");
const { termoLike } = require("../utils/busca");

const incluir = [
    { model: Imovel, as: "imovel", attributes: ["id", "codigo", "endereco"] },
    { model: Pessoa, as: "proprietario", attributes: ["id", "nome"] },
    { model: Pessoa, as: "inquilino", attributes: ["id", "nome"] },
];

const ORDENAVEIS = {
    numero: ["numero"],
    tipo: ["tipo"],
    situacao: ["situacao"],
    imovel: [{ model: Imovel, as: "imovel" }, "codigo"],
    inquilino: [{ model: Pessoa, as: "inquilino" }, "nome"],
    data_inicio: ["data_inicio"],
    data_fim: ["data_fim"],
    valor: ["valor"],
};

const listar = ({ busca, tipo, situacao, ordenar, direcao } = {}) => {
    const where = {};
    if (busca) {
        const b = termoLike(busca);
        where[Op.or] = [
            { numero: { [Op.iLike]: b } },
            { "$imovel.codigo$": { [Op.iLike]: b } },
            { "$proprietario.nome$": { [Op.iLike]: b } },
            { "$inquilino.nome$": { [Op.iLike]: b } },
        ];
    }
    if (tipo) where.tipo = tipo;
    if (situacao) where.situacao = situacao;
    return Contrato.findAll({ where, include: incluir, order: montarOrdem(ORDENAVEIS, ordenar, direcao, "numero") });
};

const buscarPorId = (id) => Contrato.findByPk(id, { include: incluir });
const criar = (campos) => Contrato.create(campos);
const atualizar = (id, campos) => Contrato.update(campos, { where: { id } });
const excluir = (id) => Contrato.destroy({ where: { id } });

module.exports = { listar, buscarPorId, criar, atualizar, excluir };
