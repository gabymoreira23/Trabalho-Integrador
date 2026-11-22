const { Sequelize } = require("sequelize");

// Instância única do Sequelize para toda a aplicação (DRY).
// new Sequelize(banco, usuario, senha, opcoes) - os valores vêm do .env.
const sequelize = new Sequelize(
    process.env.DB_NAME || "fenix",
    process.env.DB_USER || "postgres",
    process.env.DB_PASSWORD || "",
    {
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT) || 5432,
        dialect: "postgres",
        logging: false, // troque para console.log para ver o SQL gerado pelo ORM
    },
);

module.exports = sequelize;
