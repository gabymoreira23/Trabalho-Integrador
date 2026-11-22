const repository = require("./vistorias.repository");
const imoveisRepository = require("../imoveis/imoveis.repository");
const pessoasRepository = require("../pessoas/pessoas.repository");
const v = require("../utils/validacao");
const { AppError, naoEncontrado } = require("../utils/erros");

function formatar(vistoria) {
    const { imovel, cliente, responsavel, ...resto } = vistoria.toJSON();
    return {
        ...resto,
        imovel_codigo: imovel && imovel.codigo,
        imovel_endereco: imovel && imovel.endereco,
        cliente_nome: cliente && cliente.nome,
        responsavel_nome: responsavel && responsavel.nome,
    };
}

async function validarAgendamento(d) {
    const imovelId = v.id(d.imovel_id, "Imóvel");
    if (!(await imoveisRepository.buscarPorId(imovelId))) throw new AppError(400, "Selecione um imóvel cadastrado.");
    const clienteId = v.id(d.cliente_id, "Inquilino/Proprietário");
    const cliente = await pessoasRepository.buscarPorId(clienteId);
    if (!cliente || cliente.tipo === "funcionario") throw new AppError(400, "Selecione um inquilino ou proprietário válido.");
    const respId = v.id(d.responsavel_id, "Responsável");
    const resp = await pessoasRepository.buscarPorId(respId);
    if (!resp || resp.tipo !== "funcionario") throw new AppError(400, "O responsável deve ser um funcionário.");
    return {
        imovel_id: imovelId,
        cliente_id: clienteId,
        responsavel_id: respId,
        tipo: v.opcao(d.tipo, "Tipo de vistoria", ["entrada", "saida", "final"]),
        data: v.data(d.data, "Data"),
        horario: v.horario(d.horario, "Horário"),
        observacoes: v.texto(d.observacoes, "Observações", { obrigatorio: false, max: 500 }),
    };
}

const listar = async (filtros) => (await repository.listar(filtros)).map(formatar);

async function buscar(id) {
    const vistoria = await repository.buscarPorId(v.id(id, "Id"));
    if (!vistoria) throw naoEncontrado("Vistoria");
    return formatar(vistoria);
}

async function buscarCompleta(id) {
    const vistoria = await repository.buscarCompleta(v.id(id, "Id"));
    if (!vistoria) throw naoEncontrado("Vistoria");
    const dados = formatar(vistoria);
    const total = dados.reparos.reduce((soma, r) => soma + r.valor, 0);
    return { ...dados, total_orcamento: Math.round(total * 100) / 100 };
}

async function criar(dados) {
    const nova = await repository.criar(await validarAgendamento(dados));
    return buscar(nova.id);
}

async function atualizar(id, dados) {
    await buscar(id);
    await repository.atualizar(Number(id), await validarAgendamento(dados));
    return buscar(id);
}

async function excluir(id) {
    await buscar(id);
    await repository.excluir(Number(id));
}

// RF06
async function salvarChecklist(id, dados) {
    await buscar(id);
    if (!Array.isArray(dados.itens) || dados.itens.length > 200) throw new AppError(400, "Lista de itens inválida.");
    const itens = dados.itens.map((i, n) => ({
        comodo_item: v.texto(i.comodo_item, `Cômodo/Item (linha ${n + 1})`, { max: 100 }),
        estado: v.opcao(i.estado, `Estado (linha ${n + 1})`, ["bom", "regular", "ruim"]),
        observacoes: v.texto(i.observacoes, `Observações (linha ${n + 1})`, { obrigatorio: false, max: 300 }),
    }));
    await repository.substituirItens(Number(id), itens);
    return buscarCompleta(id);
}

// RF07 (depende do checklist - RF06)
async function registrarParecer(id, d) {
    const vistoria = await buscar(id);
    if ((await repository.contarItens(vistoria.id)) === 0) {
        throw new AppError(409, "Preencha o checklist antes de registrar o parecer.");
    }
    const conclusao = v.opcao(d.conclusao, "Conclusão", ["aprovada", "com_pendencias"]);
    const pendencias = v.texto(d.pendencias, "Pendências encontradas", { obrigatorio: conclusao === "com_pendencias", max: 1000 });
    await repository.atualizar(vistoria.id, {
        status: "realizada",
        conclusao,
        pendencias: conclusao === "aprovada" ? null : pendencias,
        parecer_obs: v.texto(d.parecer_obs, "Observações", { obrigatorio: false, max: 500 }),
        parecer_data: v.data(d.parecer_data, "Data do parecer", { obrigatorio: false }) || v.hoje(),
    });
    return buscarCompleta(id);
}

// RF08 (só vistoria final, depois do parecer - RF07)
async function salvarOrcamento(id, dados) {
    const vistoria = await buscar(id);
    if (vistoria.tipo !== "final") throw new AppError(409, "Orçamento de reparos só existe na vistoria final.");
    if (vistoria.status !== "realizada") throw new AppError(409, "Registre o parecer antes de lançar o orçamento.");
    if (!Array.isArray(dados.reparos) || dados.reparos.length > 100) throw new AppError(400, "Lista de reparos inválida.");
    const reparos = dados.reparos.map((r, n) => ({
        item: v.texto(r.item, `Item (linha ${n + 1})`, { max: 100 }),
        descricao: v.texto(r.descricao, `Descrição (linha ${n + 1})`, { obrigatorio: false, max: 300 }),
        valor: v.numero(r.valor, `Valor (linha ${n + 1})`),
    }));
    await repository.substituirReparos(vistoria.id, reparos);
    return buscarCompleta(id);
}

// RF09 (depois do parecer). Assinatura simples: imagem PNG desenhada na tela.
async function salvarAssinatura(id, d) {
    const vistoria = await buscar(id);
    if (vistoria.status !== "realizada") throw new AppError(409, "Registre o parecer antes de coletar as assinaturas.");
    const imagem = d.imagem;
    if (typeof imagem !== "string" || imagem.length > 400000 || !/^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/=]*$/.test(imagem)) {
        throw new AppError(400, "Assinatura inválida. Desenhe a assinatura e tente novamente.");
    }
    await repository.salvarAssinatura(vistoria.id, {
        papel: v.opcao(d.papel, "Papel da assinatura", ["responsavel", "cliente"]),
        nome: v.texto(d.nome, "Nome do assinante", { min: 3, max: 120 }),
        imagem,
    });
    return buscarCompleta(id);
}

module.exports = { listar, buscar, buscarCompleta, criar, atualizar, excluir, salvarChecklist, registrarParecer, salvarOrcamento, salvarAssinatura };
