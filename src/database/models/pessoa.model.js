const { DataTypes } = require("sequelize");
const sequelize = require("../connection");

const Pessoa = sequelize.define(
    "Pessoa",
    {
        nome: { type: DataTypes.STRING(120), allowNull: false },
        cpf_cnpj: { type: DataTypes.STRING(14), allowNull: false, unique: true },
        telefone: { type: DataTypes.STRING(30) },
        email: { type: DataTypes.STRING(120) },
        endereco: { type: DataTypes.STRING(200) },
        tipo: { type: DataTypes.STRING(12), allowNull: false }, // funcionario | proprietario | inquilino
        usuario: { type: DataTypes.STRING(40), allowNull: false, unique: true },
        senha_hash: { type: DataTypes.STRING(100), allowNull: false },
        ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        criado_em: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
        timestamps: false,
        tableName: "pessoas",
        // O hash da senha NUNCA sai nas consultas comuns. Para o login use Pessoa.scope("comSenha").
        defaultScope: { attributes: { exclude: ["senha_hash"] } },
        scopes: { comSenha: { attributes: { include: ["senha_hash"] } } },
    },
);

module.exports = Pessoa;
