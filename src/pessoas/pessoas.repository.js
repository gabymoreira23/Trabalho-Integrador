const { Op } = require("sequelize");
const { Pessoa, Imovel, Contrato } = require("../database/models");
const { montarOrdem } = require("../utils/ordenacao");
const { termoLike } = require("../utils/busca");

const ORDENAVEIS = {
    nome: ["nome"],
    tipo: ["tipo"],
    cpf_cnpj: ["cpf_cnpj"],
    usuario: ["usuario"],
    criado_em: ["criado_em"],
};

const listar = ({ busca, tipo, ordenar, direcao } = {}) => {
    const where = {};
    if (busca) {
        const b = termoLike(busca);
        where[Op.or] = [{ nome: { [Op.iLike]: b } }, { cpf_cnpj: { [Op.iLike]: b } }, { usuario: { [Op.iLike]: b } }, { email: { [Op.iLike]: b } }];
    }
    if (tipo) where.tipo = tipo;
    return Pessoa.findAll({ where, order: montarOrdem(ORDENAVEIS, ordenar, direcao, "nome") });
};

const buscarPorId = (id) => Pessoa.findByPk(id);
const criar = (campos) => Pessoa.create(campos);
const atualizar = (id, campos) => Pessoa.update(campos, { where: { id } });
const excluir = (id) => Pessoa.destroy({ where: { id } });

// A pessoa é dona de algum imóvel ou inquilina de algum contrato?
const temVinculos = async (id) => {
    const [imoveis, contratos] = await Promise.all([
        Imovel.count({ where: { proprietario_id: id } }),
        Contrato.count({ where: { inquilino_id: id } }),
    ]);
    return imoveis + contratos > 0;
};

module.exports = { listar, buscarPorId, criar, atualizar, excluir, temVinculos };
