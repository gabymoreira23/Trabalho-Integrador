const bcrypt = require("bcrypt");
const repository = require("./pessoas.repository");
const v = require("../utils/validacao");
const { AppError, naoEncontrado } = require("../utils/erros");

const TIPOS = ["funcionario", "proprietario", "inquilino"];

async function validar(d, { criando }) {
    const campos = {
        nome: v.texto(d.nome, "Nome", { min: 3, max: 120 }),
        cpf_cnpj: v.documento(d.cpf_cnpj),
        telefone: v.telefone(d.telefone),
        email: v.email(d.email),
        endereco: v.texto(d.endereco, "Endereço", { obrigatorio: false, max: 200 }),
        tipo: v.opcao(d.tipo, "Tipo", TIPOS),
        usuario: v.texto(d.usuario, "Usuário", { min: 3, max: 40 }),
        ativo: v.booleano(d.ativo, true),
    };
    if (!/^[A-Za-z0-9._-]+$/.test(campos.usuario)) {
        throw new AppError(400, "O campo Usuário deve ter apenas letras, números, ponto, hífen ou sublinhado.");
    }
    if (d.senha) {
        // bcrypt gera o sal sozinho; custo 12 (recomendado na aula)
        campos.senha_hash = await bcrypt.hash(v.texto(d.senha, "Senha", { min: 8, max: 72 }), 12);
    } else if (criando) {
        throw new AppError(400, "O campo Senha é obrigatório.");
    }
    return campos;
}

const listar = (filtros) => repository.listar(filtros);

async function buscar(id) {
    const pessoa = await repository.buscarPorId(v.id(id, "Id"));
    if (!pessoa) throw naoEncontrado("Pessoa");
    return pessoa;
}

async function criar(dados) {
    const nova = await repository.criar(await validar(dados, { criando: true }));
    return buscar(nova.id); // reconsulta: a resposta nunca inclui o hash
}

async function atualizar(id, dados, logado) {
    await buscar(id);
    const campos = await validar(dados, { criando: false });
    if (Number(id) === logado.id && (campos.ativo === false || campos.tipo !== "funcionario")) {
        throw new AppError(400, "Você não pode desativar nem alterar o perfil do seu próprio acesso.");
    }
    // Um imóvel não pode ficar com "proprietário" que virou inquilino (nem contrato com inquilino que mudou de tipo)
    const atual = await repository.buscarPorId(Number(id));
    if (campos.tipo !== atual.tipo && (await repository.temVinculos(Number(id)))) {
        throw new AppError(409, "Não é possível mudar o tipo: esta pessoa está ligada a imóveis ou contratos.");
    }
    await repository.atualizar(Number(id), campos);
    return buscar(id);
}

async function excluir(id, logado) {
    await buscar(id);
    if (Number(id) === logado.id) throw new AppError(400, "Você não pode excluir o seu próprio usuário.");
    await repository.excluir(Number(id)); // se houver vínculos, o banco recusa -> errorHandler devolve 409
}

module.exports = { listar, buscar, criar, atualizar, excluir };
