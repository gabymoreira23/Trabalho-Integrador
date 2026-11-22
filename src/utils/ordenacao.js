// Ordenação segura: o nome do campo vem da URL (?ordenar=valor), mas só usamos
// caminhos que NÓS listamos (whitelist). Qualquer outro valor cai no campo padrão.
//
// mapa = { nomeNaUrl: [...caminho para o Sequelize] }   ex.: { imovel: [{ model: Imovel, as: "imovel" }, "codigo"] }
function montarOrdem(mapa, ordenar, direcao, padrao) {
    const caminho = mapa[ordenar] || mapa[padrao];
    const sentido = String(direcao).toLowerCase() === "desc" ? "DESC" : "ASC";
    return [[...caminho, sentido]];
}

module.exports = { montarOrdem };
