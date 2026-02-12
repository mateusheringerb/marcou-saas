const Empresa = require('../models/Empresa');
const Usuario = require('../models/Usuario');
const Servico = require('../models/Servico');
const Agendamento = require('../models/Agendamento');
const HorarioFuncionamento = require('../models/HorarioFuncionamento');

// Middleware manual
const isAdmin = (req) => req.usuario.role === 'admin_geral';

exports.listarTodasEmpresas = async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ erro: "Acesso negado." });
    try {
        const empresas = await Empresa.findAll({
            where: { slug: { [require('sequelize').Op.ne]: 'admin' } },
            order: [['createdAt', 'DESC']]
        });
        res.json(empresas);
    } catch (e) { res.status(500).json({ erro: "Erro ao listar." }); }
};

// NOVO: Busca Raio-X da empresa
exports.obterDetalhesEmpresa = async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ erro: "Acesso negado." });
    try {
        const { id } = req.params;
        const empresa = await Empresa.findByPk(id, {
            include: [
                { model: Usuario, attributes: ['id', 'nome', 'email', 'role', 'atende_clientes'] }, // Equipe
                { model: Servico }, // Serviços
                { model: HorarioFuncionamento }, // Horários
                { model: Agendamento } // Para contar agendamentos
            ]
        });

        if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada." });

        res.json(empresa);
    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: "Erro ao buscar detalhes." });
    }
};

exports.criarEmpresa = async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ erro: "Acesso negado." });
    try {
        const { nome, slug, email_dono, senha_dono, plano } = req.body;

        const slugExiste = await Empresa.findOne({ where: { slug } });
        if (slugExiste) return res.status(400).json({ erro: "Link já existe." });

        const emailExiste = await Usuario.findOne({ where: { email: email_dono } });
        if (emailExiste) return res.status(400).json({ erro: "Email já cadastrado." });

        const novaEmpresa = await Empresa.create({
            nome, slug, plano: plano || 'basico',
            data_expiracao: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
            status_assinatura: 'ativa'
        });

        await Usuario.create({
            nome: "Admin " + nome,
            email: email_dono,
            senha: senha_dono,
            role: 'dono',
            atende_clientes: false,
            empresaId: novaEmpresa.id
        });

        // Horários Padrão
        for (let i = 0; i <= 6; i++) {
            await HorarioFuncionamento.create({
                dia_semana: i,
                ativo: i !== 0,
                abertura: "09:00", fechamento: "19:00",
                empresaId: novaEmpresa.id
            });
        }

        res.status(201).json(novaEmpresa);
    } catch (e) { res.status(500).json({ erro: "Erro ao criar empresa." }); }
};

// Atualiza Status e Dados Básicos (Gerenciar)
exports.atualizarEmpresaAdmin = async (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ erro: "Negado." });
    try {
        const { id } = req.params;
        const { nome, slug, cor_primaria, plano, status_assinatura } = req.body;

        const empresa = await Empresa.findByPk(id);
        if (!empresa) return res.status(404).json({ erro: "Não encontrada." });

        if (nome) empresa.nome = nome;
        if (slug) empresa.slug = slug;
        if (cor_primaria) empresa.cor_primaria = cor_primaria;
        if (plano) empresa.plano = plano;
        if (status_assinatura) empresa.status_assinatura = status_assinatura;

        await empresa.save();
        res.json({ ok: true, empresa });
    } catch (e) { res.status(500).json({ erro: "Erro ao atualizar." }); }
};