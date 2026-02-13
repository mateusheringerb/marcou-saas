const Sequelize = require('sequelize');
const database = require('../config/database');

const Agendamento = database.define('agendamento', {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    data_hora_inicio: { type: Sequelize.DATE, allowNull: false },
    data_hora_fim: { type: Sequelize.DATE, allowNull: false },
    observacoes: { type: Sequelize.STRING, allowNull: true },
    status: { type: Sequelize.ENUM('agendado', 'concluido', 'cancelado'), defaultValue: 'agendado' },
    nome_cliente_avulso: { type: Sequelize.STRING, allowNull: true } // Para clientes sem cadastro (balcão)
});

module.exports = Agendamento;