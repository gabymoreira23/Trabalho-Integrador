const { DataTypes } = require("sequelize");
const sequelize = require("../connection");

const VistoriaItem = sequelize.define(
    "VistoriaItem",
    {
        vistoria_id: { type: DataTypes.INTEGER, allowNull: false },
        comodo_item: { type: DataTypes.STRING(100), allowNull: false },
        estado: { type: DataTypes.STRING(10), allowNull: false }, // bom | regular | ruim
        observacoes: { type: DataTypes.STRING(300) },
    },
    { timestamps: false, tableName: "vistoria_itens" },
);

module.exports = VistoriaItem;
