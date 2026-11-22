const { AppError } = require("../utils/erros");

const NOMES_UNICOS = {
    cpf_cnpj: "CPF/CNPJ",
    usuario: "usuário",
    codigo: "código do imóvel",
    numero: "número do contrato",
};

// Converte erros do Sequelize/PostgreSQL em AppError (mensagem amigável, sem detalhe técnico).
function traduzir(err) {
    if (err instanceof AppError) return err;
    if (err.type === "entity.parse.failed") return new AppError(400, "Requisição inválida: JSON malformado.");
    if (err.type === "entity.too.large") return new AppError(413, "O conteúdo enviado é grande demais.");

    switch (err.name) {
        case "SequelizeUniqueConstraintError": {
            const campo = Object.keys(err.fields || {})[0];
            return new AppError(409, `Já existe um registro com este ${NOMES_UNICOS[campo] || "valor"}.`);
        }
        case "SequelizeForeignKeyConstraintError":
            return new AppError(409, "Não foi possível concluir: este registro está vinculado a outros registros (ou um item informado não existe).");
        case "SequelizeValidationError":
            return new AppError(400, "Dados inválidos. Revise os campos e tente novamente.");
        case "SequelizeDatabaseError": {
            const codigo = err.original && err.original.code;
            // 23514 = CHECK, 22P02 = formato inválido, 22003 = número fora do limite, 22001 = texto longo demais,
            // 22007/22008 = data ou hora inválida
            if (["23514", "22P02", "22003", "22001", "23502", "22007", "22008"].includes(codigo)) return new AppError(400, "Dados inválidos. Revise os campos e tente novamente.");
            return err;
        }
        default:
            return err;
    }
}

// Handler global: precisa ter 4 parâmetros e ser o ÚLTIMO middleware.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
    const erro = traduzir(err);
    const statusCode = erro.statusCode || 500;

    if (statusCode >= 500) console.error(`[ERRO] ${req.method} ${req.originalUrl}`, err); // detalhes só no servidor

    res.status(statusCode).json({
        erro: statusCode >= 500 ? "Ocorreu um erro inesperado. Tente novamente em instantes." : erro.message,
        codigo: statusCode,
    });
}

const rotaNaoEncontrada = (req, res) =>
    res.status(404).json({ erro: `Rota não encontrada: ${req.method} ${req.originalUrl}`, codigo: 404 });

module.exports = { errorHandler, rotaNaoEncontrada };
