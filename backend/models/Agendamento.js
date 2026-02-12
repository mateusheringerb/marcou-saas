// Tabela principal: Os agendamentos
const Sequelize = require('sequelize');
const database = require('../config/database');
const Empresa = require('./Empresa');
const Usuario = require('./Usuario');
const Servico = require('./Servico');

const Agendamento = database.define('agendamento', {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    data_hora_inicio: { type: Sequelize.DATE, allowNull: false },
    data_hora_fim: { type: Sequelize.DATE, allowNull: false },
    status: { type: Sequelize.ENUM('pendente', 'confirmado', 'concluido', 'cancelado'), defaultValue: 'confirmado' },
    nome_cliente_avulso: { type: Sequelize.STRING, allowNull: true }, // Se for agendado manualmente pelo dono
    observacoes: { type: Sequelize.STRING, allowNull: true }
});

Agendamento.belongsTo(Empresa, { foreignKey: 'empresaId' });
Agendamento.belongsTo(Usuario, { as: 'Cliente', foreignKey: 'clienteId' });
Agendamento.belongsTo(Usuario, { as: 'Profissional', foreignKey: 'profissionalId' });
Agendamento.belongsTo(Servico, { foreignKey: 'servicoId' });

module.exports = Agendamento;