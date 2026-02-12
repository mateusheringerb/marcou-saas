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

        // Validação básica
        if (!nome || !email || !senha) return res.status(400).json({ erro: "Preencha todos os campos." });

        const existe = await Usuario.findOne({ where: { email } });
        if (existe) return res.status(400).json({ erro: "Este email já está em uso." });

        const novo = await Usuario.create({
            nome, email, senha,
            role: role || 'profissional', // Default para profissional
            empresaId: req.usuario.empresaId
        });

        res.status(201).json({ id: novo.id, nome: novo.nome, email: novo.email, role: novo.role });
    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: "Erro interno ao adicionar membro." });
    }
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
        const horarios = req.body; // Array de horários
        const empresaId = req.usuario.empresaId;

        // Loop seguro para atualizar ou criar
        for (const h of horarios) {
            const dia = parseInt(h.dia_semana);

            // Busca se já existe config para esse dia
            const config = await HorarioFuncionamento.findOne({
                where: { empresaId, dia_semana: dia }
            });

            const dados = {
                dia_semana: dia,
                abertura: h.abertura,
                fechamento: h.fechamento,
                ativo: h.ativo,
                empresaId: empresaId
            };

            if (config) {
                await config.update(dados);
            } else {
                await HorarioFuncionamento.create(dados);
            }
        }
        res.json({ mensagem: "Horários salvos com sucesso!" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: "Erro ao salvar horários." });
    }
};

exports.listarHorarios = async (req, res) => {
    try {
        let horarios = await HorarioFuncionamento.findAll({
            where: { empresaId: req.usuario.empresaId },
            order: [['dia_semana', 'ASC']]
        });
        res.json(horarios);
    } catch (e) { res.status(500).json({ erro: "Erro ao buscar horários." }); }
};

// --- SLOTS (CÁLCULO) ---
exports.buscarDisponibilidade = async (req, res) => {
    try {
        const { data, servicoId, profissionalId } = req.query;
        const empresaId = req.usuario.empresaId;

        // 1. Validar se a loja abre neste dia
        const diaSemana = moment(data).day();
        const regra = await HorarioFuncionamento.findOne({ where: { empresaId, dia_semana: diaSemana } });

        if (!regra || !regra.ativo) return res.json([]);

        // 2. Pegar duração
        const servico = await Servico.findByPk(servicoId);
        if (!servico) return res.status(404).json({ erro: "Serviço inválido" });
        const duracao = servico.duracao_minutos;

        // 3. Pegar agendamentos do dia
        const agendamentos = await Agendamento.findAll({
            where: {
                empresaId,
                profissionalId,
                status: { [Op.not]: 'cancelado' },
                data_hora_inicio: {
                    [Op.between]: [moment(data).startOf('day').toDate(), moment(data).endOf('day').toDate()]
                }
            }
        });

        // 4. Gerar Slots
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
                // Lógica de colisão
                if (inicioSlot.isBefore(agFim) && fimSlot.isAfter(agInicio)) {
                    ocupado = true;
                    break;
                }
            }

            // Bloqueia passado
            if (inicioSlot.isBefore(moment())) ocupado = true;

            if (!ocupado) slots.push(inicioSlot.format('HH:mm'));

            // Intervalo de grade (30 min ou 15 min dependendo da preferência)
            cursor.add(30, 'minutes');
        }

        res.json(slots);

    } catch (e) { res.status(500).json({ erro: "Erro ao calcular disponibilidade." }); }
};