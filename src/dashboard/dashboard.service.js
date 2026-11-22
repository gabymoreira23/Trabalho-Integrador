const repository = require("./dashboard.repository");
const { hoje } = require("../utils/validacao");

async function resumo(usuario) {
    const equipe = usuario.tipo === "funcionario";
    const dados = equipe ? await repository.resumoEquipe(hoje()) : await repository.resumoCliente(usuario.id);
    return { perfil: equipe ? "equipe" : "cliente", atualizadoEm: new Date().toISOString(), ...dados };
}

module.exports = { resumo };
