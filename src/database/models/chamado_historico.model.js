const { DataTypes } = require("sequelize");
const sequelize = require("../connection");

const ChamadoHistorico = sequelize.define(
    "ChamadoHistorico",
    {
        chamado_id: { type: DataTypes.INTEGER, allowNull: false },
        descricao: { type: DataTypes.STRING(500), allowNull: false },
        criado_em: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    { timestamps: false, tableName: "chamado_historico" },
);

module.exports = ChamadoHistorico;
