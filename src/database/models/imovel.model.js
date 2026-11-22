const { DataTypes } = require("sequelize");
const sequelize = require("../connection");

const Imovel = sequelize.define(
    "Imovel",
    {
        codigo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
        endereco: { type: DataTypes.STRING(200), allowNull: false },
        categoria: { type: DataTypes.STRING(50), allowNull: false },
        finalidade: { type: DataTypes.STRING(10), allowNull: false }, // aluguel | venda
        valor: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            // O driver devolve NUMERIC como texto; convertemos para número.
            get() {
                return Number(this.getDataValue("valor"));
            },
        },
        disponivel: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        proprietario_id: { type: DataTypes.INTEGER, allowNull: false },
    },
    { timestamps: false, tableName: "imoveis" },
);

Imovel.associate = (models) => {
    Imovel.belongsTo(models.Pessoa, { foreignKey: "proprietario_id", as: "proprietario" });
    Imovel.hasMany(models.Contrato, { foreignKey: "imovel_id", as: "contratos" });
};

module.exports = Imovel;
