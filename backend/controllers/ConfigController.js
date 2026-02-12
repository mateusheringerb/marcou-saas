// Aqui eu gerencio a Equipe, os Horários e calculo os Slots livres
const HorarioFuncionamento = require('../models/HorarioFuncionamento');
const Agendamento = require('../models/Agendamento');
const Servico = require('../models/Servico');
const Usuario = require('../models/Usuario');
const { Op } = require('sequelize');
const moment = require('moment');

// --- EQUIPE ---
exports.listarEquipe = async (req, res) => {
    try {
        const equipe = await Usuario.findAll({
            where: { empresaId: req.usuario.empresaId, role: ['dono', 'profissional'] },
            attributes: ['id', 'nome', 'email', 'role']
        });
        res.json(equipe);
    } catch (e) { res.status(500).json({ erro: "Erro ao listar equipe." }); }
};

exports.adicionarMembro = async (req, res) => {
    try {
        const { nome, email, senha, role } = req.body;

        const existe = await Usuario.findOne({ where: { email } });
        if (existe) return res.status(400).json({ erro: "Email já cadastrado." });

        const novo = await Usuario.create({
            nome, email, senha, role,
            empresaId: req.usuario.empresaId
        });
        res.status(201).json(novo);
    } catch (e) { res.status(500).json({ erro: "Erro ao adicionar membro." }); }
};

exports.removerMembro = async (req, res) => {
    try {
        await Usuario.destroy({ where: { id: req.params.id, empresaId: req.usuario.empresaId } });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ erro: "Erro ao remover." }); }
};

// --- HORÁRIOS ---
exports.salvarHorarios = async (req, res) => {
    try {
        const horarios = req.body;

        for (const h of horarios) {
            let config = await HorarioFuncionamento.findOne({
                where: { empresaId: req.usuario.empresaId, dia_semana: h.dia_semana }
            });

            if (config) {
                await config.update(h);
            } else {
                await HorarioFuncionamento.create({ ...h, empresaId: req.usuario.empresaId });
            }
        }
        res.json({ mensagem: "Horários atualizados!" });
    } catch (e) { res.status(500).json({ erro: "Erro ao salvar horários." }); }
};

exports.listarHorarios = async (req, res) => {
    try {
        let horarios = await HorarioFuncionamento.findAll({
            where: { empresaId: req.usuario.empresaId },
            order: [['dia_semana', 'ASC']]
        });
        if (horarios.length === 0) return res.json([]);
        res.json(horarios);
    } catch (e) { res.status(500).json({ erro: "Erro ao buscar horários." }); }
};

// --- SLOTS (Cálculo Matemático) ---
exports.buscarDisponibilidade = async (req, res) => {
    try {
        const { data, servicoId, profissionalId } = req.query;
        // Pego o ID da empresa do token de quem está logado
        const empresaId = req.usuario.empresaId;

        const diaSemana = moment(data).day();

        const regra = await HorarioFuncionamento.findOne({
            where: { empresaId, dia_semana: diaSemana }
        });

        if (!regra || !regra.ativo) return res.json([]); // Fechado

        const servico = await Servico.findByPk(servicoId);
        if (!servico) return res.status(404).json({ erro: "Serviço não encontrado" });
        const duracao = servico.duracao_minutos;

        const agendamentos = await Agendamento.findAll({
            where: {
                empresaId,
                profissionalId,
                status: { [Op.not]: 'cancelado' },
                data_hora_inicio: {
                    [Op.between]: [
                        moment(data).startOf('day').toDate(),
                        moment(data).endOf('day').toDate()
                    ]
                }
            }
        });

        let slots = [];
        let cursor = moment(`${data} ${regra.abertura}`);
        const fimDia = moment(`${data} ${regra.fechamento}`);

        while (cursor.clone().add(duracao, 'minutes').isSameOrBefore(fimDia)) {
            const inicioSlot = cursor.clone();
            const fimSlot = cursor.clone().add(duracao, 'minutes');
            let ocupado = false;

            for (const ag of agendamentos) {
                const agInicio = moment(ag.data_hora_inicio);
                const agFim = moment(ag.data_hora_fim);
                if (inicioSlot.isBefore(agFim) && fimSlot.isAfter(agInicio)) {
                    ocupado = true;
                    break;
                }
            }

            if (inicioSlot.isBefore(moment())) ocupado = true; // Passado

            if (!ocupado) slots.push(inicioSlot.format('HH:mm'));
            cursor.add(30, 'minutes'); // Grade de 30 min
        }

        res.json(slots);

    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: "Erro ao calcular disponibilidade." });
    }
};