// Cria o banco (se não existir) e executa o fenix.sql.   Uso:  npm run setup
// Alternativa sem Node:  psql -U postgres -d fenix -f database/fenix.sql
require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function executar(nomeBanco = process.env.DB_NAME || "fenix") {
    if (!/^[A-Za-z0-9_]+$/.test(nomeBanco)) throw new Error("Nome de banco inválido.");
    const conexao = {
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "",
    };

    // 1) conecta no banco padrão "postgres" e cria o banco do projeto, se faltar
    const admin = new Client({ ...conexao, database: "postgres" });
    await admin.connect();
    const existe = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [nomeBanco]);
    if (existe.rowCount === 0) await admin.query(`CREATE DATABASE ${nomeBanco}`);
    await admin.end();

    // 2) roda o script (tabelas + dados iniciais)
    const banco = new Client({ ...conexao, database: nomeBanco });
    await banco.connect();
    await banco.query(fs.readFileSync(path.join(__dirname, "fenix.sql"), "utf8"));
    await banco.end();
    return nomeBanco;
}

if (require.main === module) {
    executar()
        .then((nome) => {
            console.log(`Banco "${nome}" pronto (tabelas criadas e dados iniciais inseridos).`);
            console.log("Logins de teste: admin/admin123 (funcionário) · maria/maria123 (inquilino) · joao/joao123 (proprietário)");
        })
        .catch((erro) => {
            console.error("ERRO ao preparar o banco:", erro.message);
            console.error("Confira o .env (DB_HOST, DB_USER, DB_PASSWORD) e se o PostgreSQL está rodando.");
            process.exit(1);
        });
}

module.exports = { executar };
