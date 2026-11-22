const passport = require("passport");
const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const { Pessoa } = require("../database/models");

// Estratégia JWT do Passport: lê "Authorization: Bearer <token>", confere assinatura e expiração.
const opcoes = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
    algorithms: ["HS256"], // rejeita tokens assinados com outros algoritmos (ex.: "none")
    ignoreExpiration: false,
};

passport.use(
    new JwtStrategy(opcoes, async (payload, done) => {
        try {
            // Consulta o usuário a cada requisição: quem foi desativado perde o acesso na hora.
            const pessoa = await Pessoa.findByPk(payload.id);
            if (!pessoa || !pessoa.ativo) return done(null, false);
            return done(null, pessoa); // req.user = pessoa
        } catch (erro) {
            return done(erro);
        }
    }),
);

module.exports = passport;
