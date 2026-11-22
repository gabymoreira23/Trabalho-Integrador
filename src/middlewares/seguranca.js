// Proteções gerais do servidor: cabeçalhos de segurança, cache e limite de tentativas.
// (Sem bibliotecas extras: tudo aqui é Node puro.)

// Política de conteúdo (CSP): o navegador só aceita scripts, estilos e imagens que vêm do
// próprio site. Mesmo que alguém consiga injetar um <script> numa página, o navegador se
// recusa a executá-lo. "data:" em imagens é necessário para a assinatura (PNG em base64).
const CSP = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
].join("; ");

function cabecalhosSeguranca(req, res, next) {
    res.set({
        "Content-Security-Policy": CSP,
        "X-Content-Type-Options": "nosniff", // o navegador não "adivinha" o tipo do arquivo
        "X-Frame-Options": "DENY", // o site não pode ser aberto dentro de outro (clickjacking)
        "Referrer-Policy": "no-referrer",
        "Cross-Origin-Opener-Policy": "same-origin",
        "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    });
    next();
}

// As respostas da API têm dados pessoais: o navegador não deve guardá-las.
function semCache(req, res, next) {
    res.set("Cache-Control", "no-store");
    next();
}

// Contador simples na memória: "esta chave já fez N tentativas nesta janela de tempo?"
function criarLimitador({ janelaMs, maximo }) {
    const registros = new Map(); // chave -> { total, expiraEm }

    // limpeza periódica, para o Map não crescer para sempre
    const faxina = setInterval(() => {
        const agora = Date.now();
        for (const [chave, registro] of registros) {
            if (registro.expiraEm <= agora) registros.delete(chave);
        }
    }, janelaMs);
    faxina.unref(); // não impede o programa de encerrar

    function registroAtual(chave) {
        const registro = registros.get(chave);
        if (!registro) return null;
        if (registro.expiraEm <= Date.now()) {
            registros.delete(chave);
            return null;
        }
        return registro;
    }

    return {
        // 0 = liberado; maior que 0 = quantos segundos faltam para poder tentar de novo
        segundosRestantes(chave) {
            const registro = registroAtual(chave);
            if (!registro || registro.total < maximo) return 0;
            return Math.max(1, Math.ceil((registro.expiraEm - Date.now()) / 1000));
        },
        registrar(chave) {
            const registro = registroAtual(chave);
            if (registro) registro.total += 1;
            else registros.set(chave, { total: 1, expiraEm: Date.now() + janelaMs });
        },
        zerar(chave) {
            registros.delete(chave);
        },
    };
}

// Limite geral de pedidos por endereço (IP): freia robôs e abusos.
function limitarRequisicoes({ janelaMs, maximo }) {
    const limitador = criarLimitador({ janelaMs, maximo });

    return (req, res, next) => {
        const espera = limitador.segundosRestantes(req.ip);
        if (espera > 0) {
            res.set("Retry-After", String(espera));
            return res.status(429).json({ erro: "Muitas requisições. Aguarde um pouco e tente novamente.", codigo: 429 });
        }
        limitador.registrar(req.ip);
        next();
    };
}

// Freio no login: depois de 5 senhas erradas (mesmo endereço + mesmo usuário), bloqueia por
// 15 minutos. Trava quem tenta adivinhar senhas sem atrapalhar os outros usuários.
// Só as tentativas que terminam em 401 contam; um login correto zera o contador.
function protegerLogin({ janelaMs = 15 * 60 * 1000, maximo = Number(process.env.LOGIN_MAX_TENTATIVAS) || 5 } = {}) {
    const limitador = criarLimitador({ janelaMs, maximo });

    return (req, res, next) => {
        const usuario = req.body && typeof req.body.usuario === "string" ? req.body.usuario.trim().toLowerCase().slice(0, 40) : "";
        const chave = `${req.ip}|${usuario}`;

        const espera = limitador.segundosRestantes(chave);
        if (espera > 0) {
            res.set("Retry-After", String(espera));
            return res.status(429).json({ erro: `Muitas tentativas de login. Tente novamente em ${Math.ceil(espera / 60)} minuto(s).`, codigo: 429 });
        }

        res.on("finish", () => {
            if (res.statusCode === 401) limitador.registrar(chave);
            else if (res.statusCode === 200) limitador.zerar(chave);
        });
        next();
    };
}

module.exports = { cabecalhosSeguranca, semCache, criarLimitador, limitarRequisicoes, protegerLogin };
