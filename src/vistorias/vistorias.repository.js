const { Op } = require("sequelize");
const { sequelize, Vistoria, VistoriaItem, VistoriaReparo, VistoriaAssinatura, Imovel, Pessoa } = require("../database/models");
const { montarOrdem } = require("../utils/ordenacao");
const { termoLike } = require("../utils/busca");

const incluirBasico = [
    { model: Imovel, as: "imovel", attributes: ["id", "codigo", "endereco"] },
    { model: Pessoa, as: "cliente", attributes: ["id", "nome"] },
    { model: Pessoa, as: "responsavel", attributes: ["id", "nome"] },
];

const ORDENAVEIS = {
    data: ["data"],
    tipo: ["tipo"],
    status: ["status"],
    imovel: [{ model: Imovel, as: "imovel" }, "codigo"],
    cliente: [{ model: Pessoa, as: "cliente" }, "nome"],
    responsavel: [{ model: Pessoa, as: "responsavel" }, "nome"],
};

const listar = ({ busca, tipo, status, ordenar, direcao } = {}) => {
    const where = {};
    if (busca) {
        const b = termoLike(busca);
        where[Op.or] = [
            { "$imovel.codigo$": { [Op.iLike]: b } },
            { "$imovel.endereco$": { [Op.iLike]: b } },
            { "$cliente.nome$": { [Op.iLike]: b } },
            { "$responsavel.nome$": { [Op.iLike]: b } },
        ];
    }
    if (tipo) where.tipo = tipo;
    if (status) where.status = status;
    const ordem = montarOrdem(ORDENAVEIS, ordenar, direcao, "data");
    return Vistoria.findAll({ where, include: incluirBasico, order: [...ordem, ["horario", "ASC"]] });
};

const buscarPorId = (id) => Vistoria.findByPk(id, { include: incluirBasico });

// Vistoria + checklist + orçamento + assinaturas (tela de detalhe e laudo)
const buscarCompleta = (id) =>
    Vistoria.findByPk(id, {
        include: [
            ...incluirBasico,
            { model: VistoriaItem, as: "itens" },
            { model: VistoriaReparo, as: "reparos" },
            { model: VistoriaAssinatura, as: "assinaturas" },
        ],
        order: [
            [{ model: VistoriaItem, as: "itens" }, "id", "ASC"],
            [{ model: VistoriaReparo, as: "reparos" }, "id", "ASC"],
        ],
    });

const criar = (campos) => Vistoria.create(campos);
const atualizar = (id, campos) => Vistoria.update(campos, { where: { id } });
const excluir = (id) => Vistoria.destroy({ where: { id } });
const contarItens = (id) => VistoriaItem.count({ where: { vistoria_id: id } });

// Transação: apaga e regrava a lista inteira (tudo ou nada).
const substituirItens = (id, itens) =>
    sequelize.transaction(async (t) => {
        await VistoriaItem.destroy({ where: { vistoria_id: id }, transaction: t });
        await VistoriaItem.bulkCreate(itens.map((i) => ({ ...i, vistoria_id: id })), { transaction: t });
    });

const substituirReparos = (id, reparos) =>
    sequelize.transaction(async (t) => {
        await VistoriaReparo.destroy({ where: { vistoria_id: id }, transaction: t });
        await VistoriaReparo.bulkCreate(reparos.map((r) => ({ ...r, vistoria_id: id })), { transaction: t });
    });

const salvarAssinatura = async (id, { papel, nome, imagem }) => {
    const existente = await VistoriaAssinatura.findOne({ where: { vistoria_id: id, papel } });
    if (existente) return existente.update({ nome, imagem, assinado_em: new Date() });
    return VistoriaAssinatura.create({ vistoria_id: id, papel, nome, imagem });
};

module.exports = { listar, buscarPorId, buscarCompleta, criar, atualizar, excluir, contarItens, substituirItens, substituirReparos, salvarAssinatura };
