const Agendamento = require('../models/Agendamento');
const Servico = require('../models/Servico');
const Usuario = require('../models/Usuario');
const { Op } = require('sequelize');
const moment = require('moment');

exports.criarAgendamento = async (req, res) => {
    try {
        const { servicoId, profissionalId, dataHoraInicio, nomeClienteAvulso } = req.body;
        const empresaId = req.usuario.empresaId;

        if (!servicoId || !dataHoraInicio) return res.status(400).json({ erro: "Dados incompletos." });

        // Se for dono agendando, exige profissionalId.
        if (req.usuario.role === 'dono' && !profissionalId) {
            return res.status(400).json({ erro: "Erro: Profissional não identificado." });
        }

        let clienteId = req.usuario.id;
        let nomeAvulso = null;

        // Lógica de agendamento manual
        if (req.usuario.role === 'dono' && nomeClienteAvulso) {
            clienteId = null;
            nomeAvulso = nomeClienteAvulso;
        }

        const servico = await Servico.findByPk(servicoId);
        if (!servico) return res.status(404).json({ erro: "Serviço não encontrado." });

        const inicio = moment(dataHoraInicio);
        const fim = moment(inicio).add(servico.duracao_minutos, 'minutes');

        if (inicio.isBefore(moment())) return res.status(400).json({ erro: "Data inválida (passado)." });

        const conflito = await Agendamento.findOne({
            where: {
                empresaId,
                profissionalId,
                status: { [Op.not]: 'cancelado' },
                [Op.or]: [
                    { data_hora_inicio: { [Op.between]: [inicio.toDate(), fim.toDate()] } },
                    { data_hora_fim: { [Op.between]: [inicio.toDate(), fim.toDate()] } },
                    { [Op.and]: [{ data_hora_inicio: { [Op.lte]: inicio.toDate() } }, { data_hora_fim: { [Op.gte]: fim.toDate() } }] }
                ]
            }
        });

        if (conflito) return res.status(409).json({ erro: "Horário indisponível." });

        const novo = await Agendamento.create({
            empresaId, clienteId, nome_cliente_avulso: nomeAvulso, profissionalId, servicoId,
            data_hora_inicio: inicio.toDate(), data_hora_fim: fim.toDate()
        });

        res.status(201).json(novo);
    } catch (error) { res.status(500).json({ erro: "Erro interno ao agendar." }); }
};

exports.listarMeusAgendamentos = async (req, res) => {
    try {
        const lista = await Agendamento.findAll({
            where: { clienteId: req.usuario.id, empresaId: req.usuario.empresaId },
            include: [{ model: Usuario, as: 'Profissional', attributes: ['nome'] }, { model: Servico, attributes: ['nome', 'preco'] }],
            order: [['data_hora_inicio', 'DESC']]
        });
        res.json(lista);
    } catch (error) { res.status(500).json({ erro: "Erro ao listar." }); }
};

exports.listarAgendamentosEmpresa = async (req, res) => {
    if (req.usuario.role !== 'dono' && req.usuario.role !== 'admin_geral') return res.status(403).json({ erro: "Negado." });
    try {
        const lista = await Agendamento.findAll({
            where: { empresaId: req.usuario.empresaId },
            include: [
                { model: Usuario, as: 'Cliente', attributes: ['nome'] },
                { model: Usuario, as: 'Profissional', attributes: ['nome'] },
                { model: Servico, attributes: ['nome'] }
            ],
            order: [['data_hora_inicio', 'ASC']]
        });
        res.json(lista);
    } catch (error) { res.status(500).json({ erro: "Erro ao listar." }); }
};