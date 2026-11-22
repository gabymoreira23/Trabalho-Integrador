const { DataTypes } = require("sequelize");
const sequelize = require("../connection");

const Contrato = sequelize.define(
    "Contrato",
    {
        numero: { type: DataTypes.STRING(30), allowNull: false, unique: true },
        tipo: { type: DataTypes.STRING(10), allowNull: false }, // locacao | venda
        situacao: { type: DataTypes.STRING(10), allowNull: false, defaultValue: "ativo" },
        imovel_id: { type: DataTypes.INTEGER, allowNull: false },
        proprietario_id: { type: DataTypes.INTEGER, allowNull: false },
        inquilino_id: { type: DataTypes.INTEGER, allowNull: false },
        data_inicio: { type: DataTypes.DATEONLY, allowNull: false },
        data_fim: { type: DataTypes.DATEONLY, allowNull: false },
        valor: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            get() {
                return Number(this.getDataValue("valor"));
            },
        },
    },
    { timestamps: false, tableName: "contratos" },
);

Contrato.associate = (models) => {
    Contrato.belongsTo(models.Imovel, { foreignKey: "imovel_id", as: "imovel" });
    Contrato.belongsTo(models.Pessoa, { foreignKey: "proprietario_id", as: "proprietario" });
    Contrato.belongsTo(models.Pessoa, { foreignKey: "inquilino_id", as: "inquilino" });
};

module.exports = Contrato;
