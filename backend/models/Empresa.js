// Modelo da minha tabela de Empresas
const Sequelize = require('sequelize');
const database = require('../config/database');

const Empresa = database.define('empresa', {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    nome: { type: Sequelize.STRING, allowNull: false },
    slug: { type: Sequelize.STRING, allowNull: false, unique: true },
    logo_url: { type: Sequelize.STRING, allowNull: true }, // Logo da Barbearia/Salão
    cor_primaria: { type: Sequelize.STRING, defaultValue: "#0f172a" }, // Cor tema
    plano: { type: Sequelize.ENUM('basico', 'pro'), defaultValue: 'basico' },
    status_assinatura: { type: Sequelize.ENUM('ativa', 'bloqueada', 'cancelada'), defaultValue: 'ativa' },
    data_expiracao: { type: Sequelize.DATE, allowNull: false }
});

module.exports = Empresa;