const repository = require("./chamados.repository");
const imoveisRepository = require("../imoveis/imoveis.repository");
const pessoasRepository = require("../pessoas/pessoas.repository");
const v = require("../utils/validacao");
const { AppError, naoEncontrado } = require("../utils/erros");

const CATEGORIAS = ["hidraulica", "eletrica", "estrutura", "outros"];
const NIVEIS = ["baixa", "media", "alta"];
const STATUS = ["aberto", "em_analise", "em_execucao", "concluido"];
const CANAIS = ["sistema", "telefone", "whatsapp", "presencial"];
const ROTULO_STATUS = { aberto: "Aberto", em_analise: "Em análise", em_execucao: "Em execução", concluido: "Concluído" };
const ROTULO_CANAL = { telefone: "telefone", whatsapp: "WhatsApp", presencial: "presencial" };

const ehEquipe = (usuario) => usuario.tipo === "funcionario";

function formatar(chamado) {
    const { imovel, solicitante, responsavel, ...resto } = chamado.toJSON();
    return {
        ...resto,
        imovel_codigo: imovel && imovel.codigo,
        imovel_endereco: imovel && imovel.endereco,
        solicitante_nome: solicitante && solicitante.nome,
        responsavel_nome: responsavel ? responsavel.nome : null,
    };
}

// Cliente só enxerga os próprios chamados (RF14): sobrescrevemos qualquer filtro vindo da URL.
async function listar(filtros, usuario) {
    const f = { ...filtros };
    if (!ehEquipe(usuario)) f.solicitante_id = usuario.id;
    return (await repository.listar(f)).map(formatar);
}

// Para chamado de outra pessoa o cliente recebe 404 (não revelamos que ele existe).
async function buscar(id, usuario) {
    const chamado = await repository.buscarPorId(v.id(id, "Id"));
    if (!chamado || (!ehEquipe(usuario) && chamado.solicitante_id !== usuario.id)) throw naoEncontrado("Chamado");
    const historico = (await repository.listarHistorico(chamado.id)).map((h) => h.toJSON());
    return { ...formatar(chamado), historico };
}

async function imoveisParaChamado(usuario) {
    const imoveis = ehEquipe(usuario) ? await imoveisRepository.listar() : await imoveisRepository.listarDoCliente(usuario.id);
    return imoveis.map(({ id, codigo, endereco }) => ({ id, codigo, endereco }));
}

// RF11: o cliente abre o próprio; a equipe registra em nome do cliente.
async function criar(d, usuario) {
    const imovelId = v.id(d.imovel_id, "Imóvel");
    if (!(await imoveisRepository.buscarPorId(imovelId))) throw new AppError(400, "Selecione um imóvel válido.");

    let solicitanteId = usuario.id;
    let canal = "sistema";
    if (ehEquipe(usuario)) {
        solicitanteId = v.id(d.solicitante_id, "Solicitante");
        const s = await pessoasRepository.buscarPorId(solicitanteId);
        if (!s || s.tipo === "funcionario") throw new AppError(400, "Selecione um inquilino ou proprietário como solicitante.");
        canal = v.opcao(d.canal, "Canal do pedido", CANAIS, { obrigatorio: false }) || "sistema";
    } else {
        const meus = await imoveisRepository.listarDoCliente(usuario.id);
        if (!meus.some((i) => i.id === imovelId)) throw new AppError(403, "Você só pode abrir chamados para imóveis vinculados a você.");
    }

    const novo = await repository.criar({
        imovel_id: imovelId,
        solicitante_id: solicitanteId,
        categoria: v.opcao(d.categoria, "Categoria", CATEGORIAS),
        urgencia: v.opcao(d.urgencia, "Urgência", NIVEIS),
        canal,
        descricao: v.texto(d.descricao, "Descrição", { min: 5, max: 1000 }),
    });
    await repository.registrarHistorico(novo.id, canal === "sistema" ? "Chamado aberto" : `Chamado registrado pela equipe (canal: ${ROTULO_CANAL[canal]})`);
    return buscar(novo.id, usuario);
}

// RF12 + RF13: classificar, atribuir e atualizar andamento (atualização parcial).
async function atualizar(id, d, usuario) {
    const atual = await buscar(id, usuario);
    const campos = {};
    const historico = [];

    if ("imovel_id" in d) {
        campos.imovel_id = v.id(d.imovel_id, "Imóvel");
        if (!(await imoveisRepository.buscarPorId(campos.imovel_id))) throw new AppError(400, "Selecione um imóvel válido.");
    }
    if ("categoria" in d) campos.categoria = v.opcao(d.categoria, "Categoria", CATEGORIAS);
    if ("urgencia" in d) campos.urgencia = v.opcao(d.urgencia, "Urgência", NIVEIS);
    if ("descricao" in d) campos.descricao = v.texto(d.descricao, "Descrição", { min: 5, max: 1000 });
    if ("prioridade" in d) campos.prioridade = v.opcao(d.prioridade, "Prioridade", NIVEIS, { obrigatorio: false });
    if ("prazo" in d) campos.prazo = v.data(d.prazo, "Prazo previsto", { obrigatorio: false });

    if ("responsavel_id" in d) {
        campos.responsavel_id = v.id(d.responsavel_id, "Responsável", { obrigatorio: false });
        if (campos.responsavel_id) {
            const r = await pessoasRepository.buscarPorId(campos.responsavel_id);
            if (!r || r.tipo !== "funcionario") throw new AppError(400, "O responsável deve ser um funcionário.");
            if (campos.responsavel_id !== atual.responsavel_id) historico.push(`Responsável definido: ${r.nome}`);
        }
    }

    const statusFinal = "status" in d ? v.opcao(d.status, "Status", STATUS) : atual.status;
    campos.status = statusFinal;
    if (statusFinal === "concluido") {
        const solucao = "solucao" in d ? v.texto(d.solucao, "Solução aplicada", { obrigatorio: false, max: 500 }) : atual.solucao;
        if (!solucao) throw new AppError(400, "Informe a solução aplicada para concluir o chamado.");
        campos.solucao = solucao;
        campos.data_conclusao = v.data(d.data_conclusao, "Data de conclusão", { obrigatorio: false }) || atual.data_conclusao || v.hoje();
        if (atual.status !== "concluido") historico.push(`Concluído: ${solucao}`);
    } else {
        campos.data_conclusao = null;
        if ("solucao" in d) campos.solucao = v.texto(d.solucao, "Solução aplicada", { obrigatorio: false, max: 500 });
        if (statusFinal !== atual.status) historico.push(`Status alterado para: ${ROTULO_STATUS[statusFinal]}`);
    }

    const andamento = v.texto(d.andamento, "Andamento", { obrigatorio: false, max: 500 });
    if (andamento) historico.push(andamento);

    await repository.atualizar(atual.id, campos);
    for (const texto of historico) await repository.registrarHistorico(atual.id, texto);
    return buscar(id, usuario);
}

async function excluir(id, usuario) {
    const chamado = await buscar(id, usuario);
    await repository.excluir(chamado.id);
}

module.exports = { listar, buscar, criar, atualizar, excluir, imoveisParaChamado };
