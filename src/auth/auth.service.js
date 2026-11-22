const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const repository = require("./auth.repository");
const { AppError } = require("../utils/erros");

const REFRESH_DIAS = 7;
// Hash falso: comparamos mesmo se o usuário não existe, para o tempo de resposta
// não revelar quais logins existem (enumeração de usuários).
const HASH_FALSO = bcrypt.hashSync("hash-falso-para-equalizar-tempo", 12);

const publico = (p) => ({ id: p.id, nome: p.nome, tipo: p.tipo });

// O payload leva só o mínimo: id e papel (nunca senha ou dados sensíveis).
function gerarAccessToken(pessoa) {
    return jwt.sign({ id: pessoa.id, tipo: pessoa.tipo }, process.env.JWT_SECRET, {
        algorithm: "HS256",
        expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    });
}

// Segredo DIFERENTE do access token. "jti" garante que dois tokens emitidos no mesmo
// segundo para o mesmo usuário nunca sejam iguais (a coluna token é UNIQUE).
function gerarRefreshToken(pessoa) {
    return jwt.sign({ id: pessoa.id, jti: crypto.randomUUID() }, process.env.REFRESH_SECRET, {
        algorithm: "HS256",
        expiresIn: process.env.REFRESH_EXPIRES_IN || "7d",
    });
}

async function emitirPar(pessoa) {
    const refreshToken = gerarRefreshToken(pessoa);
    await repository.criarRefreshToken({
        token: refreshToken,
        id_usuario: pessoa.id,
        expira_em: new Date(Date.now() + REFRESH_DIAS * 24 * 60 * 60 * 1000),
    });
    return { accessToken: gerarAccessToken(pessoa), refreshToken, pessoa: publico(pessoa) };
}

async function login(usuario, senha) {
    if (typeof usuario !== "string" || typeof senha !== "string" || !usuario.trim() || !senha) {
        throw new AppError(400, "Informe usuário e senha.");
    }
    const pessoa = await repository.buscarPorUsuarioComSenha(usuario.trim());
    const senhaValida = await bcrypt.compare(senha, pessoa ? pessoa.senha_hash : HASH_FALSO);
    // Mesma mensagem para usuário inexistente e senha errada.
    if (!pessoa || !senhaValida) throw new AppError(401, "Usuário ou senha inválidos.");
    if (!pessoa.ativo) throw new AppError(403, "Seu acesso está desativado. Procure a imobiliária.");
    return emitirPar(pessoa);
}

// Rotação: cada refresh token só vale UMA vez. Se um token já usado reaparecer,
// alguém pode tê-lo roubado -> revogamos TODOS os tokens do usuário.
async function renovar(refreshTokenAntigo) {
    if (!refreshTokenAntigo) throw new AppError(401, "Sessão não encontrada. Faça login.");

    let payload;
    try {
        payload = jwt.verify(refreshTokenAntigo, process.env.REFRESH_SECRET, { algorithms: ["HS256"] });
    } catch {
        throw new AppError(401, "Sua sessão expirou. Faça login novamente.");
    }

    const consumido = await repository.consumirRefreshToken(refreshTokenAntigo);
    if (!consumido) {
        await repository.revogarTodosDoUsuario(payload.id);
        throw new AppError(403, "Sessão encerrada por segurança. Faça login novamente.");
    }

    // Busca o usuário atual: perfil/situação atualizados entram no novo token.
    const pessoa = await repository.buscarPessoaPorId(payload.id);
    if (!pessoa || !pessoa.ativo) throw new AppError(401, "Sua sessão expirou. Faça login novamente.");
    return emitirPar(pessoa);
}

async function logout(refreshToken) {
    if (refreshToken) await repository.revogarToken(refreshToken);
}

module.exports = { login, renovar, logout, REFRESH_DIAS };
