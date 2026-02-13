require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const database = require('./config/database');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

// --- 1. IMPORTAÇÃO DOS MODELOS (LIMPOS) ---
const Empresa = require('./models/Empresa');
const Usuario = require('./models/Usuario');
const Servico = require('./models/Servico');
const Agendamento = require('./models/Agendamento');
const HorarioFuncionamento = require('./models/HorarioFuncionamento');

// --- 2. DEFINIÇÃO CENTRALIZADA DAS RELAÇÕES ---
// (Isso substitui qualquer código que estava dentro dos models)

// Empresa é a dona de tudo
Empresa.hasMany(Usuario, { foreignKey: 'empresaId' });
Usuario.belongsTo(Empresa, { foreignKey: 'empresaId' });

Empresa.hasMany(Servico, { foreignKey: 'empresaId' });
Servico.belongsTo(Empresa, { foreignKey: 'empresaId' });

Empresa.hasMany(Agendamento, { foreignKey: 'empresaId' });
Agendamento.belongsTo(Empresa, { foreignKey: 'empresaId' });

Empresa.hasMany(HorarioFuncionamento, { foreignKey: 'empresaId' });
HorarioFuncionamento.belongsTo(Empresa, { foreignKey: 'empresaId' });

// Agendamento conecta Cliente, Profissional e Serviço
Agendamento.belongsTo(Usuario, { as: 'Cliente', foreignKey: 'clienteId' });
Agendamento.belongsTo(Usuario, { as: 'Profissional', foreignKey: 'profissionalId' });
Agendamento.belongsTo(Servico, { foreignKey: 'servicoId' });

// --- 3. CONFIGURAÇÃO DO APP ---
const AgendamentoController = require('./controllers/AgendamentoController');
const ConfigController = require('./controllers/ConfigController');
const AdminController = require('./controllers/AdminController');
const authMiddleware = require('./middlewares/authMiddleware');
const subscriptionMiddleware = require('./middlewares/subscriptionMiddleware');

const app = express();

// Configurações de Segurança e Dados
app.use(cors({ origin: true })); // Aceita tudo (mais fácil para evitar erros de CORS em dev)
app.use(helmet());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const GOOGLE_CLIENT_ID = "517522819247-g4tut7tgkfshr4ef3ffc3gg5tj2l73rn.apps.googleusercontent.com";
const JWT_SECRET = "Mvhb@628387*";
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// --- 4. ROTAS ---

// Health Check
app.get('/api/ping', (req, res) => res.json({ status: "online" }));

// Lista Empresas (Público) - Esconde o Admin
app.get('/api/empresas', async (req, res) => {
    try {
        const empresas = await Empresa.findAll({
            where: { slug: { [require('sequelize').Op.ne]: 'admin' } },
            attributes: ['id', 'nome', 'slug', 'logo_url', 'cor_primaria']
        });
        res.json(empresas);
    } catch (e) { res.status(500).json({ erro: "Erro servidor" }); }
});

// Login Email/Senha
app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        const usuario = await Usuario.findOne({ where: { email } });

        if (!usuario || usuario.senha !== senha) {
            return res.status(401).json({ erro: "Credenciais inválidas." });
        }

        const token = jwt.sign({ id: usuario.id, role: usuario.role, empresaId: usuario.empresaId }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            token,
            usuario: {
                id: usuario.id, nome: usuario.nome, email: usuario.email,
                role: usuario.role, foto_url: usuario.foto_url, atende_clientes: usuario.atende_clientes
            }
        });
    } catch (e) { res.status(500).json({ erro: "Erro interno." }); }
});

// Login Google
app.post('/api/login/google', async (req, res) => {
    try {
        const { token, slug } = req.body;
        const ticket = await client.verifyIdToken({ idToken: token, audience: GOOGLE_CLIENT_ID });
        const { email, name, picture } = ticket.getPayload();

        const empresa = await Empresa.findOne({ where: { slug } });
        if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada." });

        let usuario = await Usuario.findOne({ where: { email } });
        if (!usuario) {
            usuario = await Usuario.create({ nome: name, email, senha: "", foto_url: picture, role: 'cliente', empresaId: empresa.id });
        }
        const appToken = jwt.sign({ id: usuario.id, role: usuario.role, empresaId: usuario.empresaId }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            token: appToken,
            usuario: {
                id: usuario.id, nome: usuario.nome, role: usuario.role,
                foto_url: usuario.foto_url, atende_clientes: usuario.atende_clientes
            }
        });
    } catch (e) { res.status(401).json({ erro: "Google falhou." }); }
});

// Cadastro
app.post('/api/cadastro', async (req, res) => {
    try {
        const { nome, email, senha, slug } = req.body;
        const empresa = await Empresa.findOne({ where: { slug } });
        if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada." });

        const existe = await Usuario.findOne({ where: { email } });
        if (existe) return res.status(400).json({ erro: "Email já cadastrado." });

        const novo = await Usuario.create({ nome, email, senha, role: 'cliente', empresaId: empresa.id });
        const token = jwt.sign({ id: novo.id, role: 'cliente', empresaId: empresa.id }, JWT_SECRET, { expiresIn: '24h' });

        res.status(201).json({ token, usuario: { id: novo.id, nome: novo.nome, role: 'cliente' } });
    } catch (e) { res.status(500).json({ erro: "Erro cadastro." }); }
});

// Dados Públicos da Empresa
app.get('/api/empresa/:slug', async (req, res) => {
    try {
        const emp = await Empresa.findOne({ where: { slug: req.params.slug } });
        if (!emp) return res.status(404).json({ erro: "Não encontrada" });
        res.json({ id: emp.id, nome: emp.nome, cor_primaria: emp.cor_primaria, logo_url: emp.logo_url });
    } catch (e) { res.status(500).json({ erro: "Erro servidor." }); }
});

// --- ROTAS DO ADMIN MASTER ---
app.get('/api/admin/empresas', authMiddleware, AdminController.listarTodasEmpresas);
app.get('/api/admin/empresas/:id', authMiddleware, AdminController.obterDetalhesEmpresa);
app.post('/api/admin/empresas', authMiddleware, AdminController.criarEmpresa);
app.put('/api/admin/empresas/:id', authMiddleware, AdminController.atualizarEmpresaAdmin);
app.put('/api/admin/empresas/:id/status', authMiddleware, AdminController.alterarStatusEmpresa);

// --- ROTAS DO SISTEMA (LOGADO) ---
app.get('/api/agendamentos/meus', authMiddleware, AgendamentoController.listarMeusAgendamentos);
app.get('/api/agendamentos/empresa', authMiddleware, subscriptionMiddleware, AgendamentoController.listarAgendamentosEmpresa);
app.post('/api/agendar', authMiddleware, subscriptionMiddleware, AgendamentoController.criarAgendamento);

app.get('/api/equipe', authMiddleware, ConfigController.listarEquipe);
app.post('/api/equipe', authMiddleware, subscriptionMiddleware, ConfigController.adicionarMembro);
app.delete('/api/equipe/:id', authMiddleware, subscriptionMiddleware, ConfigController.removerMembro);

app.get('/api/config/horarios', authMiddleware, ConfigController.listarHorarios);
app.post('/api/config/horarios', authMiddleware, subscriptionMiddleware, ConfigController.salvarHorarios);
app.get('/api/disponibilidade', authMiddleware, ConfigController.buscarDisponibilidade);

app.put('/api/perfil', authMiddleware, ConfigController.atualizarPerfil);
app.put('/api/config/empresa', authMiddleware, subscriptionMiddleware, ConfigController.atualizarEmpresa);

// CRUD Serviços
app.get('/api/servicos', authMiddleware, async (req, res) => {
    try {
        const s = await Servico.findAll({ where: { empresaId: req.usuario.empresaId } });
        res.json(s);
    } catch (e) { res.status(500).json({ erro: "Erro" }); }
});
app.post('/api/servicos', authMiddleware, subscriptionMiddleware, async (req, res) => {
    if (req.usuario.role !== 'dono' && req.usuario.role !== 'admin_geral') return res.status(403).json({ erro: "Proibido" });
    try {
        const dados = { ...req.body, preco: parseFloat(req.body.preco), duracao_minutos: parseInt(req.body.duracao_minutos), empresaId: req.usuario.empresaId };
        const s = await Servico.create(dados);
        res.json(s);
    } catch (e) { res.status(500).json({ erro: "Erro" }); }
});
app.put('/api/servicos/:id', authMiddleware, subscriptionMiddleware, async (req, res) => {
    if (req.usuario.role !== 'dono') return res.status(403).json({ erro: "Proibido" });
    try {
        const s = await Servico.findOne({ where: { id: req.params.id } });
        if (s) {
            await s.update({ ...req.body, preco: parseFloat(req.body.preco), duracao_minutos: parseInt(req.body.duracao_minutos) });
            res.json(s);
        } else res.status(404).json({ erro: "Não encontrado" });
    } catch (e) { res.status(500).json({ erro: "Erro" }); }
});
app.delete('/api/servicos/:id', authMiddleware, subscriptionMiddleware, async (req, res) => {
    if (req.usuario.role !== 'dono') return res.status(403).json({ erro: "Proibido" });
    await Servico.destroy({ where: { id: req.params.id } });
    res.json({ ok: true });
});

// Inicialização
const PORT = process.env.PORT || 3001;
// Force: false mantém os dados. Rode seed.js manualmente se precisar resetar.
database.sync({ force: false }).then(() => {
    app.listen(PORT, () => console.log(`🚀 API RODANDO NA PORTA ${PORT}`));
});