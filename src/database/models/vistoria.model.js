const { DataTypes } = require("sequelize");
const sequelize = require("../connection");

const Vistoria = sequelize.define(
    "Vistoria",
    {
        imovel_id: { type: DataTypes.INTEGER, allowNull: false },
        cliente_id: { type: DataTypes.INTEGER, allowNull: false },
        responsavel_id: { type: DataTypes.INTEGER, allowNull: false },
        tipo: { type: DataTypes.STRING(10), allowNull: false }, // entrada | saida | final
        data: { type: DataTypes.DATEONLY, allowNull: false },
        horario: { type: DataTypes.STRING(5), allowNull: false },
        observacoes: { type: DataTypes.STRING(500) },
        status: { type: DataTypes.STRING(10), allowNull: false, defaultValue: "agendada" },
        conclusao: { type: DataTypes.STRING(15) },
        pendencias: { type: DataTypes.STRING(1000) },
        parecer_obs: { type: DataTypes.STRING(500) },
        parecer_data: { type: DataTypes.DATEONLY },
    },
    { timestamps: false, tableName: "vistorias" },
);

Vistoria.associate = (models) => {
    Vistoria.belongsTo(models.Imovel, { foreignKey: "imovel_id", as: "imovel" });
    Vistoria.belongsTo(models.Pessoa, { foreignKey: "cliente_id", as: "cliente" });
    Vistoria.belongsTo(models.Pessoa, { foreignKey: "responsavel_id", as: "responsavel" });
    Vistoria.hasMany(models.VistoriaItem, { foreignKey: "vistoria_id", as: "itens", onDelete: "CASCADE" });
    Vistoria.hasMany(models.VistoriaReparo, { foreignKey: "vistoria_id", as: "reparos", onDelete: "CASCADE" });
    Vistoria.hasMany(models.VistoriaAssinatura, { foreignKey: "vistoria_id", as: "assinaturas", onDelete: "CASCADE" });
};

module.exports = Vistoria;
