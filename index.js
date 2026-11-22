// Ponto de entrada. O dotenv precisa ser carregado ANTES de qualquer outro módulo que use process.env.
require("dotenv").config({ quiet: true });

const sequelize = require("./src/database/connection");

// Os segredos NUNCA ficam no código: vêm do .env (veja .env.example).
for (const nome of ["JWT_SECRET", "REFRESH_SECRET"]) {
    if (!process.env[nome] || process.env[nome].length < 32) {
        console.error(`ERRO: defina ${nome} no arquivo .env (mínimo de 32 caracteres). Veja o .env.example.`);
        process.exit(1);
    }
}
if (process.env.JWT_SECRET === process.env.REFRESH_SECRET) {
    console.error("ERRO: JWT_SECRET e REFRESH_SECRET devem ser diferentes.");
    process.exit(1);
}

const fs = require("fs");
const path = require("path");
const app = require("./src/app");
const authRepository = require("./src/auth/auth.repository");
const PORT = process.env.PORT || 3000;

async function iniciar() {
    try {
        await sequelize.authenticate();
        console.log("Conectado ao PostgreSQL.");
    } catch (erro) {
        console.error("ERRO: não foi possível conectar ao banco. Confira o .env e se o PostgreSQL está rodando.");
        console.error(`(${erro.message})`);
        process.exit(1);
    }
    if (!fs.existsSync(path.join(__dirname, "frontend", "dist", "index.html"))) {
        console.warn("AVISO: o frontend ainda não foi compilado. Rode \"npm run build\" (ou use \"npm run dev:frontend\" em outro terminal).");
    }
    // Limpa os refresh tokens vencidos ao ligar e a cada 6 horas (se falhar, só avisa; não derruba o servidor).
    const limpar = () => authRepository.limparTokensExpirados().catch((e) => console.warn("Aviso: não foi possível limpar tokens vencidos.", e.message));
    limpar();
    setInterval(limpar, 6 * 60 * 60 * 1000).unref();

    app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
}

iniciar();
