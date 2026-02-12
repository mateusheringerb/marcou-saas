// ARQUIVO: backend/controllers/ConfigController.js
// Controle total de Equipe, Horários e Slots Matemáticos

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
        if (!nome || !email || !senha) return res.status(400).json({ erro: "Preencha todos os campos." });

        // Verifica se o email já existe no sistema todo
        const existe = await Usuario.findOne({ where: { email } });
        if (existe) return res.status(400).json({ erro: "Este email já possui conta no sistema." });

        const novo = await Usuario.create({
            nome, email, senha,
            role: role || 'profissional',
            empresaId: req.usuario.empresaId
        });

        res.status(201).json({ id: novo.id, nome: novo.nome, email: novo.email, role: novo.role });
    } catch (e) {
        console.error("Erro add membro:", e);
        res.status(500).json({ erro: "Erro interno ao salvar membro." });
    }
};

exports.removerMembro = async (req, res) => {
    try {
        // Impede que o dono se exclua
        if (req.params.id == req.usuario.id) return res.status(400).json({ erro: "Você não pode se excluir." });

        await Usuario.destroy({ where: { id: req.params.id, empresaId: req.usuario.empresaId } });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ erro: "Erro ao remover." }); }
};

// --- HORÁRIOS ---
exports.salvarHorarios = async (req, res) => {
    try {
        const horarios = req.body;
        const empresaId = req.usuario.empresaId;

        // Uso Promise.all para salvar tudo em paralelo e rápido
        await Promise.all(horarios.map(async (h) => {
            const dia = parseInt(h.dia_semana);
            const dados = {
                dia_semana: dia,
                abertura: h.abertura || "09:00",
                fechamento: h.fechamento || "18:00",
                almoco_inicio: h.almoco_inicio || null,
                almoco_fim: h.almoco_fim || null,
                ativo: h.ativo,
                empresaId: empresaId
            };

            const config = await HorarioFuncionamento.findOne({ where: { empresaId, dia_semana: dia } });

            if (config) await config.update(dados);
            else await HorarioFuncionamento.create(dados);
        }));

        res.json({ mensagem: "Horários salvos!" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: "Erro ao salvar horários." });
    }
};

exports.listarHorarios = async (req, res) => {
    try {
        const horarios = await HorarioFuncionamento.findAll({
            where: { empresaId: req.usuario.empresaId },
            order: [['dia_semana', 'ASC']]
        });
        res.json(horarios);
    } catch (e) { res.status(500).json({ erro: "Erro ao buscar horários." }); }
};

// --- SLOTS MATEMÁTICOS (A Lógica "Foda") ---
exports.buscarDisponibilidade = async (req, res) => {
    try {
        const { data, servicoId, profissionalId } = req.query;
        const empresaId = req.usuario.empresaId;

        // 1. Dados Básicos
        const servico = await Servico.findByPk(servicoId);
        if (!servico) return res.status(404).json({ erro: "Serviço não encontrado" });
        const duracao = parseInt(servico.duracao_minutos);

        // 2. Data e Dia da Semana
        const dataRef = moment(data).format('YYYY-MM-DD');
        const diaSemana = moment(dataRef).day();

        // 3. Regra do Dia
        const regra = await HorarioFuncionamento.findOne({ where: { empresaId, dia_semana: diaSemana } });
        if (!regra || !regra.ativo) return res.json([]); // Fechado

        // Função: Converte "09:30" para minutos (570)
        const toMin = (time) => {
            if (!time) return null;
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
        };

        const abertura = toMin(regra.abertura);
        const fechamento = toMin(regra.fechamento);
        const almocoIni = toMin(regra.almoco_inicio);
        const almocoFim = toMin(regra.almoco_fim);

        // 4. Buscar Agendamentos do Dia
        const agendamentos = await Agendamento.findAll({
            where: {
                empresaId,
                profissionalId,
                status: { [Op.not]: 'cancelado' },
                data_hora_inicio: {
                    [Op.between]: [
                        moment(dataRef).startOf('day').toDate(),
                        moment(dataRef).endOf('day').toDate()
                    ]
                }
            }
        });

        // Mapeia agendamentos para intervalos em minutos
        const ocupacoes = agendamentos.map(ag => {
            const inicio = moment(ag.data_hora_inicio);
            const fim = moment(ag.data_hora_fim);
            return {
                inicio: inicio.hours() * 60 + inicio.minutes(),
                fim: fim.hours() * 60 + fim.minutes()
            };
        });

        // 5. Cálculo de Slots
        let slots = [];
        let cursor = abertura;

        // Verifica se é hoje para bloquear passado
        const agora = moment();
        const ehHoje = agora.format('YYYY-MM-DD') === dataRef;
        const minutosAgora = agora.hours() * 60 + agora.minutes();

        // Loop principal: Percorre o dia em intervalos
        while (cursor + duracao <= fechamento) {
            const slotInicio = cursor;
            const slotFim = cursor + duracao;
            let disponivel = true;

            // a. Bloqueia Passado
            if (ehHoje && slotInicio <= minutosAgora) disponivel = false;

            // b. Bloqueia Almoço (Se configurado)
            if (disponivel && almocoIni && almocoFim) {
                // Se o slot toca no intervalo de almoço
                if (
                    (slotInicio >= almocoIni && slotInicio < almocoFim) || // Começa no almoço
                    (slotFim > almocoIni && slotFim <= almocoFim) ||       // Termina no almoço
                    (slotInicio <= almocoIni && slotFim >= almocoFim)      // Engloba o almoço
                ) {
                    disponivel = false;
                }
            }

            // c. Bloqueia Agendamentos Existentes
            if (disponivel) {
                for (const oc of ocupacoes) {
                    // Se sobrepõe
                    if (slotInicio < oc.fim && slotFim > oc.inicio) {
                        disponivel = false;
                        break;
                    }
                }
            }

            if (disponivel) {
                const h = Math.floor(slotInicio / 60).toString().padStart(2, '0');
                const m = (slotInicio % 60).toString().padStart(2, '0');
                slots.push(`${h}:${m}`);
            }

            // Pula: Se quiser intervalos fixos (30min) ou dinâmicos (tamanho do serviço)
            cursor += 30; // Grade fixa de 30 em 30 min
        }

        res.json(slots);

    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: "Erro ao calcular disponibilidade." });
    }
};