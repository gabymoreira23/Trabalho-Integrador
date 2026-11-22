const { DataTypes } = require("sequelize");
const sequelize = require("../connection");

// Refresh tokens precisam de estado no servidor (para poder revogar e detectar reutilização).
const RefreshToken = sequelize.define(
    "RefreshToken",
    {
        token: { type: DataTypes.STRING(512), allowNull: false, unique: true },
        id_usuario: { type: DataTypes.INTEGER, allowNull: false },
        expira_em: { type: DataTypes.DATE, allowNull: false },
        revogado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        criado_em: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    { timestamps: false, tableName: "refresh_tokens" },
);

RefreshToken.associate = (models) => {
    RefreshToken.belongsTo(models.Pessoa, { foreignKey: "id_usuario", as: "usuario" });
};

module.exports = RefreshToken;
