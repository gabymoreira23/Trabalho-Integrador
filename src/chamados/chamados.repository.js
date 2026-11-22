const { Op } = require("sequelize");
const { sequelize, Chamado, ChamadoHistorico, Imovel, Pessoa } = require("../database/models");
const { montarOrdem } = require("../utils/ordenacao");
const { termoLike } = require("../utils/busca");

const incluir = [
    { model: Imovel, as: "imovel", attributes: ["id", "codigo", "endereco"] },
    { model: Pessoa, as: "solicitante", attributes: ["id", "nome"] },
    { model: Pessoa, as: "responsavel", attributes: ["id", "nome"] },
];

const ORDENAVEIS = {
    id: ["id"],
    criado_em: ["criado_em"],
    imovel: [{ model: Imovel, as: "imovel" }, "codigo"],
    categoria: ["categoria"],
    status: ["status"],
    // urgência não é ordem alfabética: alta > média > baixa
    urgencia: [sequelize.literal(`CASE "Chamado"."urgencia" WHEN 'alta' THEN 3 WHEN 'media' THEN 2 ELSE 1 END`)],
    prazo: ["prazo"],
    solicitante: [{ model: Pessoa, as: "solicitante" }, "nome"],
};

const listar = ({ busca, status, urgencia, categoria, imovel_id, solicitante_id, ordenar, direcao } = {}) => {
    const where = {};
    if (busca) {
        const b = termoLike(busca);
        const ou = [{ descricao: { [Op.iLike]: b } }, { "$imovel.codigo$": { [Op.iLike]: b } }, { "$solicitante.nome$": { [Op.iLike]: b } }];
        const numero = String(busca).replace(/^#/, "");
        if (/^\d{1,9}$/.test(numero)) ou.push({ id: Number(numero) });
        where[Op.or] = ou;
    }
    if (status) where.status = status;
    if (urgencia) where.urgencia = urgencia;
    if (categoria) where.categoria = categoria;
    if (imovel_id) where.imovel_id = Number(imovel_id);
    if (solicitante_id) where.solicitante_id = Number(solicitante_id);
    return Chamado.findAll({ where, include: incluir, order: montarOrdem(ORDENAVEIS, ordenar, direcao, "criado_em") });
};

const buscarPorId = (id) => Chamado.findByPk(id, { include: incluir });
const listarHistorico = (id) => ChamadoHistorico.findAll({ where: { chamado_id: id }, order: [["id", "ASC"]] });
const registrarHistorico = (chamadoId, descricao) => ChamadoHistorico.create({ chamado_id: chamadoId, descricao });
const criar = (campos) => Chamado.create(campos);
const atualizar = (id, campos) => Chamado.update(campos, { where: { id } });
const excluir = (id) => Chamado.destroy({ where: { id } });

module.exports = { listar, buscarPorId, listarHistorico, registrarHistorico, criar, atualizar, excluir };
