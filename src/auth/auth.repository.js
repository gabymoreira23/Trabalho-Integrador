const { Op } = require("sequelize");
const { Pessoa, RefreshToken } = require("../database/models");

// scope("comSenha") é o único jeito de trazer o senha_hash (usado só no login)
const buscarPorUsuarioComSenha = (usuario) => Pessoa.scope("comSenha").findOne({ where: { usuario } });
const buscarPessoaPorId = (id) => Pessoa.findByPk(id);

const criarRefreshToken = (dados) => RefreshToken.create(dados);

// UPDATE atômico: só "consome" o token se ele ainda não foi revogado.
// Retorna quantas linhas foram alteradas (0 = token já usado/revogado ou inexistente).
const consumirRefreshToken = async (token) => {
    const [alteradas] = await RefreshToken.update({ revogado: true }, { where: { token, revogado: false } });
    return alteradas;
};

const revogarTodosDoUsuario = (idUsuario) =>
    RefreshToken.update({ revogado: true }, { where: { id_usuario: idUsuario } });

const revogarToken = (token) => RefreshToken.update({ revogado: true }, { where: { token } });

// Tokens vencidos nunca mais servem (o JWT já recusa): apagá-los evita a tabela crescer para sempre.
const limparTokensExpirados = () => RefreshToken.destroy({ where: { expira_em: { [Op.lt]: new Date() } } });

module.exports = {
    buscarPorUsuarioComSenha,
    buscarPessoaPorId,
    criarRefreshToken,
    consumirRefreshToken,
    revogarTodosDoUsuario,
    revogarToken,
    limparTokensExpirados,
};
