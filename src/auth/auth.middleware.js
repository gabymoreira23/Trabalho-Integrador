const passport = require("./auth.config");

// AUTENTICAÇÃO ("quem é você?") -> 401 se ausente, inválido ou expirado.
// Usamos o modo callback do Passport para devolver mensagens claras (e o aviso "expirado",
// que o frontend usa para renovar o access token automaticamente).
function autenticar(req, res, next) {
    passport.authenticate("jwt", { session: false }, (erro, pessoa, info) => {
        if (erro) return next(erro);
        if (!pessoa) {
            const expirado = info && info.name === "TokenExpiredError";
            return res.status(401).json({
                erro: expirado ? "Token expirado." : "Sua sessão expirou. Faça login novamente.",
                expirado,
                codigo: 401,
            });
        }
        req.user = pessoa;
        next();
    })(req, res, next);
}

// AUTORIZAÇÃO ("o que você pode fazer?") -> 403 se logado mas sem o perfil necessário.
// Usar DEPOIS de autenticar. Ex.: autorizar("funcionario")
const autorizar = (...perfis) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ erro: "Não autenticado.", codigo: 401 });
    if (!perfis.includes(req.user.tipo)) {
        return res.status(403).json({ erro: "Você não tem permissão para acessar este recurso.", codigo: 403 });
    }
    next();
};

module.exports = { autenticar, autorizar };
