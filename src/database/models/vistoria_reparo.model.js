const { DataTypes } = require("sequelize");
const sequelize = require("../connection");

const VistoriaReparo = sequelize.define(
    "VistoriaReparo",
    {
        vistoria_id: { type: DataTypes.INTEGER, allowNull: false },
        item: { type: DataTypes.STRING(100), allowNull: false },
        descricao: { type: DataTypes.STRING(300) },
        valor: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            get() {
                return Number(this.getDataValue("valor"));
            },
        },
    },
    { timestamps: false, tableName: "vistoria_reparos" },
);

module.exports = VistoriaReparo;
