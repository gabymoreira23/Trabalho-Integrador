const service = require("./auth.service");

// O refresh token vai em cookie HttpOnly (JavaScript não consegue ler -> XSS não rouba).
// path "/auth": o navegador só envia o cookie para /auth/refresh e /auth/logout.
const OPCOES_COOKIE = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // só HTTPS em produção
    sameSite: "strict", // proteção contra CSRF
    path: "/auth",
};

function guardarCookie(res, refreshToken) {
    res.cookie("refreshToken", refreshToken, { ...OPCOES_COOKIE, maxAge: service.REFRESH_DIAS * 24 * 60 * 60 * 1000 });
}

// O access token vai no corpo e fica em MEMÓRIA no frontend (nunca em localStorage).
async function login(req, res) {
    const { usuario, senha } = req.body || {};
    const { accessToken, refreshToken, pessoa } = await service.login(usuario, senha);
    guardarCookie(res, refreshToken);
    res.status(200).json({ accessToken, pessoa });
}

async function refresh(req, res) {
    try {
        const { accessToken, refreshToken, pessoa } = await service.renovar(req.cookies.refreshToken);
        guardarCookie(res, refreshToken);
        res.status(200).json({ accessToken, pessoa });
    } catch (erro) {
        res.clearCookie("refreshToken", OPCOES_COOKIE); // sessão inválida: limpa o cookie
        throw erro;
    }
}

async function logout(req, res) {
    await service.logout(req.cookies.refreshToken);
    res.clearCookie("refreshToken", OPCOES_COOKIE);
    res.status(204).send();
}

// req.user foi preenchido pelo Passport (middleware autenticar)
const me = (req, res) => res.json({ pessoa: { id: req.user.id, nome: req.user.nome, tipo: req.user.tipo } });

module.exports = { login, refresh, logout, me };
