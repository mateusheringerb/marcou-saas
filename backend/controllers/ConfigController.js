const HorarioFuncionamento = require('../models/HorarioFuncionamento');
const Agendamento = require('../models/Agendamento');
const Servico = require('../models/Servico');
const Usuario = require('../models/Usuario');
const { Op } = require('sequelize');
const moment = require('moment');

// --- GERENCIAR EQUIPE ---
exports.listarEquipe = async (req, res) => {
    try {
        // Retorna donos e profissionais desta empresa
        const equipe = await Usuario.findAll({
            where: { empresaId: req.usuario.empresaId, role: ['dono', 'profissional'] },
            attributes: ['id', 'nome', 'email', 'role'] // Não retorna a senha por segurança
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
            nome, email, senha, role, // role deve ser 'profissional' ou 'dono'
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

// --- GERENCIAR HORÁRIOS DE FUNCIONAMENTO ---
exports.salvarHorarios = async (req, res) => {
    try {
        const horarios = req.body; // Recebe array do frontend

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

        if (horarios.length === 0) {
            return res.json([]);
        }
        res.json(horarios);
    } catch (e) { res.status(500).json({ erro: "Erro ao buscar horários." }); }
};

// --- CÁLCULO DE DISPONIBILIDADE (SLOTS) ---
exports.buscarDisponibilidade = async (req, res) => {
    try {
        const { data, servicoId, profissionalId } = req.query;
        // Pega a empresa do usuário logado OU da query string se for rota pública (futuro)
        const empresaId = req.usuario.empresaId;

        // 1. Descobrir dia da semana (0=Dom, 1=Seg...)
        const diaSemana = moment(data).day();

        // 2. Buscar regra de funcionamento
        const regra = await HorarioFuncionamento.findOne({
            where: { empresaId, dia_semana: diaSemana }
        });

        if (!regra || !regra.ativo) {
            return res.json([]); // Fechado neste dia
        }

        // 3. Duração do serviço
        const servico = await Servico.findByPk(servicoId);
        if (!servico) return res.status(404).json({ erro: "Serviço não encontrado" });
        const duracao = servico.duracao_minutos;

        // 4. Buscar agendamentos existentes
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

        // 5. Gerar Slots
        let slots = [];
        let cursor = moment(`${data} ${regra.abertura}`);
        const fimDia = moment(`${data} ${regra.fechamento}`);

        while (cursor.clone().add(duracao, 'minutes').isSameOrBefore(fimDia)) {
            const inicioSlot = cursor.clone();
            const fimSlot = cursor.clone().add(duracao, 'minutes');

            let ocupado = false;

            // Colisão com agendamentos
            for (const ag of agendamentos) {
                const agInicio = moment(ag.data_hora_inicio);
                const agFim = moment(ag.data_hora_fim);

                if (inicioSlot.isBefore(agFim) && fimSlot.isAfter(agInicio)) {
                    ocupado = true;
                    break;
                }
            }

            // Não mostrar horários passados (se for hoje)
            if (inicioSlot.isBefore(moment())) {
                ocupado = true;
            }

            if (!ocupado) {
                slots.push(inicioSlot.format('HH:mm'));
            }

            // Intervalo de grade: 30 minutos (Pode ajustar aqui se quiser slots de 15 em 15 ou igual a duração)
            cursor.add(30, 'minutes');
        }

        res.json(slots);

    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: "Erro ao calcular disponibilidade." });
    }
};