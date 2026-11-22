const { DataTypes } = require("sequelize");
const sequelize = require("../connection");

const VistoriaAssinatura = sequelize.define(
    "VistoriaAssinatura",
    {
        vistoria_id: { type: DataTypes.INTEGER, allowNull: false },
        papel: { type: DataTypes.STRING(12), allowNull: false }, // responsavel | cliente
        nome: { type: DataTypes.STRING(120), allowNull: false },
        imagem: { type: DataTypes.TEXT, allowNull: false },
        assinado_em: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    { timestamps: false, tableName: "vistoria_assinaturas" },
);

module.exports = VistoriaAssinatura;
