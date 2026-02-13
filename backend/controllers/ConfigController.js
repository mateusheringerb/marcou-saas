const HorarioFuncionamento = require('../models/HorarioFuncionamento');
const Agendamento = require('../models/Agendamento');
const Servico = require('../models/Servico');
const Usuario = require('../models/Usuario');
const Empresa = require('../models/Empresa');
const { Op } = require('sequelize');
const moment = require('moment');

exports.listarEquipe = async (req, res) => {
    try {
        const equipe = await Usuario.findAll({
            where: { empresaId: req.usuario.empresaId, role: ['dono', 'profissional'] },
            attributes: ['id', 'nome', 'email', 'role', 'foto_url', 'atende_clientes']
        });
        res.json(equipe);
    } catch (e) { res.status(500).json({ erro: "Erro ao listar." }); }
};

exports.adicionarMembro = async (req, res) => {
    try {
        const { nome, email, senha, role, foto_url, atende_clientes } = req.body;
        const existe = await Usuario.findOne({ where: { email } });
        if (existe) return res.status(400).json({ erro: "Email em uso." });

        const novo = await Usuario.create({
            nome, email, senha, role: role || 'profissional',
            atende_clientes: atende_clientes !== undefined ? atende_clientes : true,
            foto_url, empresaId: req.usuario.empresaId
        });
        res.status(201).json(novo);
    } catch (e) { res.status(500).json({ erro: "Erro ao adicionar." }); }
};

exports.removerMembro = async (req, res) => {
    try {
        if (req.params.id == req.usuario.id) return res.status(400).json({ erro: "Não pode se excluir." });
        await Usuario.destroy({ where: { id: req.params.id, empresaId: req.usuario.empresaId } });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ erro: "Erro." }); }
};

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
    } catch (e) { res.status(500).json({ erro: "Erro ao atualizar." }); }
};

exports.atualizarEmpresa = async (req, res) => {
    if (req.usuario.role !== 'dono') return res.status(403).json({ erro: "Proibido." });
    try {
        const e = await Empresa.findByPk(req.usuario.empresaId);
        await e.update(req.body);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ erro: "Erro." }); }
};

exports.salvarHorarios = async (req, res) => {
    try {
        const horarios = req.body;
        await Promise.all(horarios.map(async (h) => {
            const dia = parseInt(h.dia_semana);
            const dados = { ...h, dia_semana: dia, empresaId: req.usuario.empresaId };
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

exports.buscarDisponibilidade = async (req, res) => {
    try {
        const { data, servicosIds, profissionalId } = req.query;
        const empresaId = req.usuario.empresaId;

        if (!servicosIds) return res.status(400).json({ erro: "Selecione serviços." });
        const idsArray = servicosIds.split(',');

        const servicos = await Servico.findAll({ where: { id: idsArray } });
        if (servicos.length === 0) return res.status(404).json({ erro: "Serviços não encontrados." });

        const duracaoTotal = servicos.reduce((acc, s) => acc + s.duracao_minutos, 0);

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

        // FUSO HORÁRIO BRASIL (-3): Solução para horários sumindo
        const agoraBR = moment().utcOffset(-3);
        const ehHoje = agoraBR.format('YYYY-MM-DD') === dataRef;
        const minAgora = agoraBR.hours() * 60 + agoraBR.minutes();

        while (cursor + duracaoTotal <= fech) {
            const ini = cursor; const fim = cursor + duracaoTotal;
            let livre = true;

            if (ehHoje && ini < (minAgora + 15)) livre = false; // Bloqueia passado

            if (livre && almI !== null && almF !== null) {
                if ((ini >= almI && ini < almF) || (fim > almI && fim <= almF) || (ini <= almI && fim >= almF)) {
                    livre = false;
                }
            }

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
            cursor += 30;
        }
        res.json(slots);
    } catch (e) { res.status(500).json({ erro: "Erro slots." }); }
};