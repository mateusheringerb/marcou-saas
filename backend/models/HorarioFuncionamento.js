const Sequelize = require('sequelize');
const database = require('../config/database');

const HorarioFuncionamento = database.define('horario_funcionamento', {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    dia_semana: { type: Sequelize.INTEGER, allowNull: false }, // 0=Dom, 1=Seg...
    abertura: { type: Sequelize.STRING, allowNull: false, defaultValue: "09:00" },
    fechamento: { type: Sequelize.STRING, allowNull: false, defaultValue: "18:00" },
    almoco_inicio: { type: Sequelize.STRING, allowNull: true },
    almoco_fim: { type: Sequelize.STRING, allowNull: true },
    ativo: { type: Sequelize.BOOLEAN, defaultValue: true }
});

module.exports = HorarioFuncionamento;