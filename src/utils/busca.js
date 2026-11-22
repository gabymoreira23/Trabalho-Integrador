// Prepara o texto digitado na busca para usar com Op.iLike.
// Sem isto, quem digita "%" ou "_" "casaria" com tudo (são curingas do LIKE).
// Aqui eles passam a valer como texto comum. Também limita o tamanho a 100 caracteres.
function termoLike(busca) {
    return `%${String(busca).slice(0, 100).replace(/[\\%_]/g, "\\$&")}%`;
}

module.exports = { termoLike };
