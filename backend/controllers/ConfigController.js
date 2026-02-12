const HorarioFuncionamento = require('../models/HorarioFuncionamento');
const Agendamento = require('../models/Agendamento');
const Servico = require('../models/Servico');
const Usuario = require('../models/Usuario');
const Empresa = require('../models/Empresa');
const { Op } = require('sequelize');
const moment = require('moment');

// --- EQUIPE ---
exports.listarEquipe = async (req, res) => {
    try {
        const equipe = await Usuario.findAll({
            where: { empresaId: req.usuario.empresaId, role: ['dono', 'profissional'] },
            attributes: ['id', 'nome', 'email', 'role', 'foto_url', 'atende_clientes']
        });
        res.json(equipe);
    } catch (e) { res.status(500).json({ erro: "Erro ao listar equipe." }); }
};

exports.adicionarMembro = async (req, res) => {
    try {
        const { nome, email, senha, role } = req.body;
        const existe = await Usuario.findOne({ where: { email } });
        if (existe) return res.status(400).json({ erro: "Email já em uso." });

        const novo = await Usuario.create({
            nome, email, senha, role: role || 'profissional', atende_clientes: true,
            empresaId: req.usuario.empresaId
        });
        res.status(201).json(novo);
    } catch (e) { res.status(500).json({ erro: "Erro ao adicionar." }); }
};

exports.removerMembro = async (req, res) => {
    try {
        if (req.params.id == req.usuario.id) return res.status(400).json({ erro: "Impossível remover a si mesmo." });
        await Usuario.destroy({ where: { id: req.params.id, empresaId: req.usuario.empresaId } });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ erro: "Erro." }); }
};

// --- PERFIL & EMPRESA ---
exports.atualizarPerfil = async (req, res) => {
    try {
        const { nome, email, foto_url, atende_clientes } = req.body;
        const u = await Usuario.findByPk(req.usuario.id);
        if (nome) u.nome = nome;
        if (email) u.email = email;
        if (foto_url) u.foto_url = foto_url;
        if (atende_clientes !== undefined) u.atende_clientes = atende_clientes;

        await u.save();
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ erro: "Erro ao atualizar perfil." }); }
};

exports.atualizarEmpresa = async (req, res) => {
    if (req.usuario.role !== 'dono') return res.status(403).json({ erro: "Proibido." });
    try {
        const { nome, logo_url, cor_primaria } = req.body;
        const e = await Empresa.findByPk(req.usuario.empresaId);
        if (nome) e.nome = nome;
        if (logo_url) e.logo_url = logo_url;
        if (cor_primaria) e.cor_primaria = cor_primaria;

        await e.save();
        res.json({ ok: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: "Erro ao salvar empresa. Imagem muito grande?" });
    }
};

// --- HORÁRIOS ---
exports.salvarHorarios = async (req, res) => {
    try {
        const horarios = req.body;
        await Promise.all(horarios.map(async (h) => {
            const dia = parseInt(h.dia_semana);
            const dados = {
                dia_semana: dia,
                abertura: h.abertura || "09:00",
                fechamento: h.fechamento || "18:00",
                almoco_inicio: h.almoco_inicio || null,
                almoco_fim: h.almoco_fim || null,
                ativo: h.ativo,
                empresaId: req.usuario.empresaId
            };
            const conf = await HorarioFuncionamento.findOne({ where: { empresaId: req.usuario.empresaId, dia_semana: dia } });
            if (conf) await conf.update(dados); else await HorarioFuncionamento.create(dados);
        }));
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ erro: "Erro." }); }
};

exports.listarHorarios = async (req, res) => {
    try {
        const h = await HorarioFuncionamento.findAll({ where: { empresaId: req.usuario.empresaId }, order: [['dia_semana', 'ASC']] });
        res.json(h);
    } catch (e) { res.status(500).json({ erro: "Erro." }); }
};

// --- SLOTS (CORRIGIDO PARA O BRASIL) ---
exports.buscarDisponibilidade = async (req, res) => {
    try {
        const { data, servicoId, profissionalId } = req.query;
        const empresaId = req.usuario.empresaId;

        const servico = await Servico.findByPk(servicoId);
        if (!servico) return res.status(404).json({ erro: "Serviço?" });
        const duracao = parseInt(servico.duracao_minutos);

        const dataRef = moment(data).format('YYYY-MM-DD');
        const diaSemana = moment(dataRef).day();

        const regra = await HorarioFuncionamento.findOne({ where: { empresaId, dia_semana: diaSemana } });
        if (!regra || !regra.ativo) return res.json([]);

        const toMin = (t) => t ? parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1]) : null;
        const aber = toMin(regra.abertura);
        const fech = toMin(regra.fechamento);
        const almI = toMin(regra.almoco_inicio);
        const almF = toMin(regra.almoco_fim);

        const agendamentos = await Agendamento.findAll({
            where: {
                empresaId, profissionalId, status: { [Op.not]: 'cancelado' },
                data_hora_inicio: { [Op.between]: [moment(dataRef).startOf('day').toDate(), moment(dataRef).endOf('day').toDate()] }
            }
        });

        const ocupacoes = agendamentos.map(a => {
            const i = moment(a.data_hora_inicio); const f = moment(a.data_hora_fim);
            return { ini: i.hours() * 60 + i.minutes(), fim: f.hours() * 60 + f.minutes() };
        });

        let slots = [];
        let cursor = aber;

        // CORREÇÃO DE TIMEZONE: Força horário de Brasília (-3)
        const agoraBR = moment().utcOffset(-3);
        const ehHoje = agoraBR.format('YYYY-MM-DD') === dataRef;
        const minAgora = agoraBR.hours() * 60 + agoraBR.minutes();

        while (cursor + duracao <= fech) {
            const ini = cursor; const fim = cursor + duracao;
            let livre = true;

            // Bloqueia passado (com margem de 15 min)
            if (ehHoje && ini < (minAgora + 15)) livre = false;

            // Bloqueia almoço
            if (livre && almI !== null && almF !== null) {
                if ((ini >= almI && ini < almF) || (fim > almI && fim <= almF) || (ini <= almI && fim >= almF)) livre = false;
            }

            // Bloqueia agendamentos
            if (livre) {
                for (const o of ocupacoes) {
                    if (ini < o.fim && fim > o.ini) { livre = false; break; }
                }
            }

            if (livre) {
                const h = Math.floor(ini / 60).toString().padStart(2, '0');
                const m = (ini % 60).toString().padStart(2, '0');
                slots.push(`${h}:${m}`);
            }
            cursor += 30; // Pula de 30 em 30 min
        }
        res.json(slots);
    } catch (e) { console.error(e); res.status(500).json({ erro: "Erro slots." }); }
};