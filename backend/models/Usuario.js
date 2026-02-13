const Sequelize = require('sequelize');
const database = require('../config/database');

const Usuario = database.define('usuario', {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    nome: { type: Sequelize.STRING, allowNull: false },
    email: { type: Sequelize.STRING, allowNull: false },
    senha: { type: Sequelize.STRING, allowNull: true },
    foto_url: { type: Sequelize.TEXT, allowNull: true }, // TEXT para suportar Base64
    role: { type: Sequelize.ENUM('admin_geral', 'dono', 'profissional', 'cliente'), defaultValue: 'cliente' },
    atende_clientes: { type: Sequelize.BOOLEAN, defaultValue: true }
});

module.exports = Usuario;