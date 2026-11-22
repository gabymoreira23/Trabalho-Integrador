const { DataTypes } = require("sequelize");
const sequelize = require("../connection");

const Chamado = sequelize.define(
    "Chamado",
    {
        imovel_id: { type: DataTypes.INTEGER, allowNull: false },
        solicitante_id: { type: DataTypes.INTEGER, allowNull: false },
        categoria: { type: DataTypes.STRING(10), allowNull: false },
        urgencia: { type: DataTypes.STRING(5), allowNull: false },
        canal: { type: DataTypes.STRING(10), allowNull: false, defaultValue: "sistema" },
        descricao: { type: DataTypes.STRING(1000), allowNull: false },
        status: { type: DataTypes.STRING(12), allowNull: false, defaultValue: "aberto" },
        prioridade: { type: DataTypes.STRING(5) },
        responsavel_id: { type: DataTypes.INTEGER },
        prazo: { type: DataTypes.DATEONLY },
        data_conclusao: { type: DataTypes.DATEONLY },
        solucao: { type: DataTypes.STRING(500) },
        criado_em: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    { timestamps: false, tableName: "chamados" },
);

Chamado.associate = (models) => {
    Chamado.belongsTo(models.Imovel, { foreignKey: "imovel_id", as: "imovel" });
    Chamado.belongsTo(models.Pessoa, { foreignKey: "solicitante_id", as: "solicitante" });
    Chamado.belongsTo(models.Pessoa, { foreignKey: "responsavel_id", as: "responsavel" });
    Chamado.hasMany(models.ChamadoHistorico, { foreignKey: "chamado_id", as: "historico", onDelete: "CASCADE" });
};

module.exports = Chamado;
