// Erro "esperado": carrega o status HTTP e uma mensagem segura para mostrar ao usuário.
// O errorHandler usa err.statusCode (mesmo padrão do handout de API REST).
class AppError extends Error {
    constructor(statusCode, mensagem) {
        super(mensagem);
        this.statusCode = statusCode;
    }
}

const naoEncontrado = (o = "Registro") => new AppError(404, `${o} não encontrado.`);

module.exports = { AppError, naoEncontrado };
