const Sequelize = require('sequelize');
const database = require('../config/database');
const Empresa = require('./Empresa');

const HorarioFuncionamento = database.define('horario_funcionamento', {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    dia_semana: { type: Sequelize.INTEGER, allowNull: false }, // 0=Domingo, 1=Segunda...
    abertura: { type: Sequelize.STRING, defaultValue: "09:00" },
    fechamento: { type: Sequelize.STRING, defaultValue: "18:00" },
    ativo: { type: Sequelize.BOOLEAN, defaultValue: true }, // Se a loja abre neste dia
    almoco_inicio: { type: Sequelize.STRING, allowNull: true },
    almoco_fim: { type: Sequelize.STRING, allowNull: true }
});

HorarioFuncionamento.belongsTo(Empresa, { foreignKey: 'empresaId' });
Empresa.hasMany(HorarioFuncionamento, { foreignKey: 'empresaId' });

module.exports = HorarioFuncionamento;