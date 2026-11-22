const { Op } = require("sequelize");
const { Pessoa, Imovel, Contrato, Vistoria, Chamado } = require("../database/models");

// Transforma [{ status: "aberto", count: 3 }] em { aberto: 3 } preenchendo com 0 o que não existe.
async function contarPor(Model, campo, chaves, where = {}) {
    const linhas = await Model.count({ where, group: [campo] });
    const resultado = Object.fromEntries(chaves.map((k) => [k, 0]));
    linhas.forEach((l) => { resultado[l[campo]] = Number(l.count); });
    return resultado;
}

async function resumoEquipe(hoje) {
    const [pessoas, imoveis, contratos, vistorias, chamados, usuariosAtivos, imoveisDisponiveis, contratosAtivos, chamadosSemResponsavel] = await Promise.all([
        Pessoa.count(), Imovel.count(), Contrato.count(), Vistoria.count(), Chamado.count(),
        Pessoa.count({ where: { ativo: true } }),
        Imovel.count({ where: { disponivel: true } }),
        Contrato.count({ where: { situacao: "ativo" } }),
        Chamado.count({ where: { responsavel_id: null, status: { [Op.ne]: "concluido" } } }),
    ]);
    const [pessoasPorTipo, chamadosPorStatus, chamadosPorUrgencia, vistoriasPorStatus, proximasVistorias, ultimosChamados] = await Promise.all([
        contarPor(Pessoa, "tipo", ["funcionario", "proprietario", "inquilino"]),
        contarPor(Chamado, "status", ["aberto", "em_analise", "em_execucao", "concluido"]),
        contarPor(Chamado, "urgencia", ["baixa", "media", "alta"]),
        contarPor(Vistoria, "status", ["agendada", "realizada"]),
        Vistoria.findAll({
            where: { status: "agendada", data: { [Op.gte]: hoje } },
            include: [{ model: Imovel, as: "imovel", attributes: ["codigo"] }, { model: Pessoa, as: "cliente", attributes: ["nome"] }],
            order: [["data", "ASC"], ["horario", "ASC"]],
            limit: 5,
        }),
        Chamado.findAll({ include: [{ model: Imovel, as: "imovel", attributes: ["codigo"] }], order: [["id", "DESC"]], limit: 5 }),
    ]);
    return {
        totais: { pessoas, imoveis, contratos, vistorias, chamados },
        usuariosAtivos, imoveisDisponiveis, contratosAtivos, chamadosSemResponsavel,
        pessoasPorTipo, chamadosPorStatus, chamadosPorUrgencia, vistoriasPorStatus,
        proximasVistorias: proximasVistorias.map((x) => ({ id: x.id, tipo: x.tipo, data: x.data, horario: x.horario, imovel_codigo: x.imovel.codigo, cliente_nome: x.cliente.nome })),
        ultimosChamados: ultimosChamados.map((c) => ({ id: c.id, categoria: c.categoria, urgencia: c.urgencia, status: c.status, criado_em: c.criado_em, imovel_codigo: c.imovel.codigo })),
    };
}

async function resumoCliente(pessoaId) {
    const where = { solicitante_id: pessoaId };
    const [total, chamadosPorStatus, ultimos] = await Promise.all([
        Chamado.count({ where }),
        contarPor(Chamado, "status", ["aberto", "em_analise", "em_execucao", "concluido"], where),
        Chamado.findAll({ where, include: [{ model: Imovel, as: "imovel", attributes: ["codigo"] }], order: [["id", "DESC"]], limit: 5 }),
    ]);
    return {
        totais: { chamados: total },
        chamadosPorStatus,
        ultimosChamados: ultimos.map((c) => ({ id: c.id, categoria: c.categoria, urgencia: c.urgencia, status: c.status, criado_em: c.criado_em, imovel_codigo: c.imovel.codigo })),
    };
}

module.exports = { resumoEquipe, resumoCliente };
