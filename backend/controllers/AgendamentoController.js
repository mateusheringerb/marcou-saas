const Agendamento = require('../models/Agendamento');
const Servico = require('../models/Servico');
const Usuario = require('../models/Usuario');
const { Op } = require('sequelize');
const moment = require('moment');

exports.criarAgendamento = async (req, res) => {
    try {
        const { servicosIds, profissionalId, dataHoraInicio, nomeClienteAvulso } = req.body;
        const empresaId = req.usuario.empresaId;

        // Validação: servicosIds deve ser um array de IDs [1, 2]
        if (!servicosIds || servicosIds.length === 0 || !dataHoraInicio) return res.status(400).json({ erro: "Dados incompletos." });

        let clienteId = req.usuario.id;
        let nomeAvulso = null;

        if (req.usuario.role === 'dono' && nomeClienteAvulso) {
            clienteId = null;
            nomeAvulso = nomeClienteAvulso;
        }

        // Busca serviços para somar tempo
        const servicos = await Servico.findAll({ where: { id: servicosIds } });
        if (servicos.length === 0) return res.status(404).json({ erro: "Serviços não encontrados." });

        const duracaoTotal = servicos.reduce((acc, s) => acc + s.duracao_minutos, 0);
        const nomesServicos = servicos.map(s => s.nome).join(' + ');

        const inicio = moment(dataHoraInicio);
        const fim = moment(inicio).add(duracaoTotal, 'minutes');

        // Check Colisão
        const conflito = await Agendamento.findOne({
            where: {
                empresaId, profissionalId, status: { [Op.not]: 'cancelado' },
                [Op.or]: [
                    { data_hora_inicio: { [Op.between]: [inicio.toDate(), fim.toDate()] } },
                    { data_hora_fim: { [Op.between]: [inicio.toDate(), fim.toDate()] } }
                ]
            }
        });

        if (conflito) return res.status(409).json({ erro: "Horário ocupado." });

        const novo = await Agendamento.create({
            empresaId, clienteId, nome_cliente_avulso: nomeAvulso, profissionalId,
            servicoId: servicosIds[0], // Salva o primeiro como referência técnica
            observacoes: nomesServicos, // Salva o nome composto para exibição
            data_hora_inicio: inicio.toDate(), data_hora_fim: fim.toDate()
        });

        res.status(201).json(novo);
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "Erro interno." });
    }
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
            include: [{ model: Usuario, as: 'Cliente', attributes: ['nome'] }, { model: Usuario, as: 'Profissional', attributes: ['nome'] }, { model: Servico }],
            order: [['data_hora_inicio', 'ASC']]
        });
        res.json(lista);
    } catch (error) { res.status(500).json({ erro: "Erro ao listar." }); }
};