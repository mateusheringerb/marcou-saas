const Sequelize = require('sequelize');
const database = require('../config/database');
const Empresa = require('./Empresa');

const Usuario = database.define('usuario', {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    nome: { type: Sequelize.STRING, allowNull: false },
    email: { type: Sequelize.STRING, allowNull: false },
    senha: { type: Sequelize.STRING, allowNull: true }, // Pode ser null (Google Login)
    role: { type: Sequelize.ENUM('admin_geral', 'dono', 'profissional', 'cliente'), defaultValue: 'cliente' }
});

Usuario.belongsTo(Empresa, { foreignKey: 'empresaId' });
Empresa.hasMany(Usuario, { foreignKey: 'empresaId' });

module.exports = Usuario;