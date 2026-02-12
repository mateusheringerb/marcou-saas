const Sequelize = require('sequelize');
const database = require('../config/database');
const Empresa = require('./Empresa');

const Servico = database.define('servico', {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    nome: { type: Sequelize.STRING, allowNull: false },
    descricao: { type: Sequelize.STRING, allowNull: true },
    preco: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
    duracao_minutos: { type: Sequelize.INTEGER, allowNull: false }
});

Servico.belongsTo(Empresa, { foreignKey: 'empresaId' });
Empresa.hasMany(Servico, { foreignKey: 'empresaId' });

module.exports = Servico;