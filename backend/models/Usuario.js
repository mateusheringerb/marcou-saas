const Sequelize = require('sequelize');
const database = require('../config/database');
const Empresa = require('./Empresa');

const Usuario = database.define('usuario', {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    nome: { type: Sequelize.STRING, allowNull: false },
    email: { type: Sequelize.STRING, allowNull: false },
    senha: { type: Sequelize.STRING, allowNull: true },
    // MUDANÇA CRÍTICA: TEXT permite strings gigantes (Base64 de imagens)
    foto_url: { type: Sequelize.TEXT, allowNull: true },
    role: { type: Sequelize.ENUM('admin_geral', 'dono', 'profissional', 'cliente'), defaultValue: 'cliente' },
    // NOVO: Define se esse usuário aparece na lista de agendamento
    atende_clientes: { type: Sequelize.BOOLEAN, defaultValue: true }
});

Usuario.belongsTo(Empresa, { foreignKey: 'empresaId' });
Empresa.hasMany(Usuario, { foreignKey: 'empresaId' });

module.exports = Usuario;