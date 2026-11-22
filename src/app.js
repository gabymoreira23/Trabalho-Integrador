const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const passport = require("./auth/auth.config");
const { autenticar, autorizar } = require("./auth/auth.middleware");
const { errorHandler, rotaNaoEncontrada } = require("./middlewares/errorHandler");
const { cabecalhosSeguranca, semCache, limitarRequisicoes } = require("./middlewares/seguranca");

const app = express();
app.disable("x-powered-by"); // não anuncia a tecnologia do servidor
app.use(cabecalhosSeguranca); // CSP, X-Frame-Options, nosniff...

// JSON: 100 KB para tudo, exceto a assinatura (imagem PNG em texto), que pode chegar a 500 KB.
const jsonPadrao = express.json({ limit: "100kb" });
const jsonAssinatura = express.json({ limit: "500kb" });
const ROTA_ASSINATURA = /^\/vistorias\/\d+\/assinatura\/?$/;
app.use((req, res, next) => (ROTA_ASSINATURA.test(req.path) ? jsonAssinatura : jsonPadrao)(req, res, next));

app.use(cookieParser()); // necessário para ler o cookie do refresh token
app.use(passport.initialize()); // sem passport.session(): a API usa JWT, não sessão

// Frontend React compilado (npm run build gera frontend/dist). Os DADOS só saem pela API, que exige token.
app.use(express.static(path.join(__dirname, "..", "frontend", "dist")));

// Respostas da API não ficam em cache; e no máximo 300 pedidos por minuto por endereço.
// (Nos testes automáticos o limite geral fica desligado, porque eles fazem centenas de pedidos seguidos.)
app.use(["/auth", "/dashboard", "/chamados", "/pessoas", "/imoveis", "/contratos", "/vistorias"], semCache);
if (process.env.NODE_ENV !== "test") app.use(limitarRequisicoes({ janelaMs: 60 * 1000, maximo: 300 }));

// Rotas públicas de autenticação
app.use("/auth", require("./auth/auth.routes"));

// Rotas protegidas: autenticar (quem é?) -> autorizar (pode?) -> rotas do recurso
const equipe = [autenticar, autorizar("funcionario")];
app.use("/dashboard", autenticar, require("./dashboard/dashboard.routes"));
app.use("/chamados", autenticar, require("./chamados/chamados.routes")); // cliente e equipe
app.use("/pessoas", equipe, require("./pessoas/pessoas.routes"));
app.use("/imoveis", equipe, require("./imoveis/imoveis.routes"));
app.use("/contratos", equipe, require("./contratos/contratos.routes"));
app.use("/vistorias", equipe, require("./vistorias/vistorias.routes"));

// Por último: rota inexistente e handler global de erros
app.use(rotaNaoEncontrada);
app.use(errorHandler);

module.exports = app;
