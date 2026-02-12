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
        const { nome, email, senha, role, foto_url, atende_clientes } = req.body;
        if (!nome || !email || !senha) return res.status(400).json({ erro: "Preencha campos." });

        const existe = await Usuario.findOne({ where: { email } });
        if (existe) return res.status(400).json({ erro: "Email já cadastrado." });

        const novo = await Usuario.create({
            nome, email, senha, foto_url,
            role: role || 'profissional',
            atende_clientes: atende_clientes !== undefined ? atende_clientes : true,
            empresaId: req.usuario.empresaId
        });

        res.status(201).json(novo);
    } catch (e) { res.status(500).json({ erro: "Erro ao adicionar." }); }
};

exports.removerMembro = async (req, res) => {
    try {
        if (req.params.id == req.usuario.id) return res.status(400).json({ erro: "Não pode se excluir." });
        await Usuario.destroy({ where: { id: req.params.id, empresaId: req.usuario.empresaId } });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ erro: "Erro ao remover." }); }
};

// --- PERFIL ---
exports.atualizarPerfil = async (req, res) => {
    try {
        const { nome, email, foto_url, atende_clientes } = req.body;
        const usuario = await Usuario.findByPk(req.usuario.id);
        if (!usuario) return res.status(404).json({ erro: "Usuario não encontrado." });

        if (nome) usuario.nome = nome;
        if (email) usuario.email = email;
        if (foto_url) usuario.foto_url = foto_url;

        // Se o usuário mandou true ou false, atualiza. Se não mandou, mantém.
        if (atende_clientes !== undefined) usuario.atende_clientes = atende_clientes;

        await usuario.save();
        res.json({ ok: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: "Erro ao atualizar perfil." });
    }
};

exports.atualizarEmpresa = async (req, res) => {
    if (req.usuario.role !== 'dono') return res.status(403).json({ erro: "Proibido" });
    try {
        const { nome, logo_url, cor_primaria } = req.body;
        const empresa = await Empresa.findByPk(req.usuario.empresaId);

        if (nome) empresa.nome = nome;
        if (logo_url) empresa.logo_url = logo_url;
        if (cor_primaria) empresa.cor_primaria = cor_primaria;

        await empresa.save();
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
        const empresaId = req.usuario.empresaId;

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
        res.json({ mensagem: "Salvo!" });
    } catch (e) { res.status(500).json({ erro: "Erro." }); }
};

exports.listarHorarios = async (req, res) => {
    try {
        const horarios = await HorarioFuncionamento.findAll({
            where: { empresaId: req.usuario.empresaId },
            order: [['dia_semana', 'ASC']]
        });
        res.json(horarios);
    } catch (e) { res.status(500).json({ erro: "Erro." }); }
};

// --- SLOTS (LÓGICA CORRIGIDA PARA O BRASIL) ---
exports.buscarDisponibilidade = async (req, res) => {
    try {
        const { data, servicoId, profissionalId } = req.query;
        const empresaId = req.usuario.empresaId;

        const servico = await Servico.findByPk(servicoId);
        if (!servico) return res.status(404).json({ erro: "Serviço inválido" });
        const duracao = parseInt(servico.duracao_minutos);

        const dataRef = moment(data).format('YYYY-MM-DD');
        const diaSemana = moment(dataRef).day();

        const regra = await HorarioFuncionamento.findOne({ where: { empresaId, dia_semana: diaSemana } });
        // Se não tiver regra ou ativo = false, retorna vazio
        if (!regra || !regra.ativo) return res.json([]);

        const toMin = (t) => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
        const abertura = toMin(regra.abertura);
        const fechamento = toMin(regra.fechamento);
        const almocoIni = toMin(regra.almoco_inicio);
        const almocoFim = toMin(regra.almoco_fim);

        const agendamentos = await Agendamento.findAll({
            where: {
                empresaId, profissionalId, status: { [Op.not]: 'cancelado' },
                data_hora_inicio: { [Op.between]: [moment(dataRef).startOf('day').toDate(), moment(dataRef).endOf('day').toDate()] }
            }
        });

        const ocupacoes = agendamentos.map(ag => {
            const i = moment(ag.data_hora_inicio); const f = moment(ag.data_hora_fim);
            return { inicio: i.hours() * 60 + i.minutes(), fim: f.hours() * 60 + f.minutes() };
        });

        let slots = [];
        let cursor = abertura;

        // FUSO HORÁRIO BRASIL (-3)
        // Isso garante que se for 18h no servidor (UTC) mas 15h no Brasil, ainda mostre horários
        const agoraBrasil = moment().utcOffset(-3);
        const ehHoje = agoraBrasil.format('YYYY-MM-DD') === dataRef;
        const minutosAgora = agoraBrasil.hours() * 60 + agoraBrasil.minutes();

        while (cursor + duracao <= fechamento) {
            const ini = cursor; const fim = cursor + duracao;
            let livre = true;

            // Bloqueio de Passado (Com buffer de 30min para não agendar muito em cima)
            if (ehHoje && ini <= (minutosAgora + 30)) livre = false;

            // Bloqueio de Almoço (Só se tiver horário definido)
            if (livre && almocoIni !== null && almocoFim !== null) {
                if ((ini >= almocoIni && ini < almocoFim) || (fim > almocoIni && fim <= almocoFim) || (ini <= almocoIni && fim >= almocoFim)) livre = false;
            }

            // Bloqueio de Agendamentos
            if (livre) {
                for (const oc of ocupacoes) {
                    if (ini < oc.fim && fim > oc.inicio) { livre = false; break; }
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
    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: "Erro ao calcular slots." });
    }
};