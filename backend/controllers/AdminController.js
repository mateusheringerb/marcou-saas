const Empresa = require('../models/Empresa');
const Usuario = require('../models/Usuario');
const Servico = require('../models/Servico');
const Agendamento = require('../models/Agendamento');
const HorarioFuncionamento = require('../models/HorarioFuncionamento');

// Middleware manual de segurança
const isAdmin = (req) => req.usuario.role === 'admin_geral';

exports.listarTodasEmpresas = async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ erro: "Acesso negado." });
    try {
        const empresas = await Empresa.findAll({
            where: { slug: { [require('sequelize').Op.ne]: 'admin' } },
            order: [['createdAt', 'DESC']]
        });
        res.json(empresas);
    } catch (e) { res.status(500).json({ erro: "Erro ao listar empresas." }); }
};

exports.obterDetalhesEmpresa = async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ erro: "Acesso negado." });
    try {
        const { id } = req.params;
        const empresa = await Empresa.findByPk(id, {
            include: [
                { model: Usuario },             // Traz a equipe
                { model: Servico },             // Traz serviços
                { model: HorarioFuncionamento },// Traz horários
                { model: Agendamento }          // Traz agendamentos (para estatísticas)
            ]
        });

        if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada." });

        res.json(empresa);
    } catch (e) {
        console.error("Erro detalhes:", e);
        res.status(500).json({ erro: "Erro ao carregar detalhes da empresa." });
    }
};

exports.criarEmpresa = async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ erro: "Acesso negado." });
    try {
        const { nome, slug, email_dono, senha_dono, plano } = req.body;

        const slugExiste = await Empresa.findOne({ where: { slug } });
        if (slugExiste) return res.status(400).json({ erro: "Link (slug) já existe." });

        const emailExiste = await Usuario.findOne({ where: { email: email_dono } });
        if (emailExiste) return res.status(400).json({ erro: "Email já cadastrado." });

        const novaEmpresa = await Empresa.create({
            nome, slug, plano: plano || 'basico',
            data_expiracao: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
            status_assinatura: 'ativa'
        });

        // CORREÇÃO: Nome exato, sem prefixo "Admin"
        await Usuario.create({
            nome: nome, // Usa o nome da barbearia ou o nome passado
            email: email_dono,
            senha: senha_dono,
            role: 'dono',
            atende_clientes: true, // CORREÇÃO: Dono começa atendendo por padrão
            empresaId: novaEmpresa.id
        });

        // Horários Padrão
        for (let i = 0; i <= 6; i++) {
            await HorarioFuncionamento.create({
                dia_semana: i,
                ativo: i !== 0, // Domingo fechado
                abertura: "09:00", fechamento: "19:00",
                almoco_inicio: "12:00", almoco_fim: "13:00",
                empresaId: novaEmpresa.id
            });
        }

        res.status(201).json(novaEmpresa);
    } catch (e) { res.status(500).json({ erro: "Erro ao criar empresa." }); }
};

exports.atualizarEmpresaAdmin = async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ erro: "Negado." });
    try {
        const { id } = req.params;
        const empresa = await Empresa.findByPk(id);
        if (!empresa) return res.status(404).json({ erro: "Não encontrada" });

        await empresa.update(req.body); // Atualiza qualquer campo enviado
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ erro: "Erro ao atualizar." }); }
};

exports.alterarStatusEmpresa = async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ erro: "Negado." });
    try {
        const empresa = await Empresa.findByPk(req.params.id);
        if (!empresa) return res.status(404).json({ erro: "Não encontrada." });

        empresa.status_assinatura = req.body.status;
        await empresa.save();
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ erro: "Erro." }); }
};