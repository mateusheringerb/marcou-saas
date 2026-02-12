require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const database = require('./config/database');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

// Modelos
const Empresa = require('./models/Empresa');
const Usuario = require('./models/Usuario');
const Servico = require('./models/Servico');
const Agendamento = require('./models/Agendamento');
const HorarioFuncionamento = require('./models/HorarioFuncionamento');

// Controladores
const AgendamentoController = require('./controllers/AgendamentoController');
const ConfigController = require('./controllers/ConfigController');
const AdminController = require('./controllers/AdminController'); // Importe o novo controller
const authMiddleware = require('./middlewares/authMiddleware');
const subscriptionMiddleware = require('./middlewares/subscriptionMiddleware');

const app = express();

const allowedOrigins = [
    'http://localhost:3000',
    'https://marcou.agapeconnect.com.br',
    'https://marcou-frontend.vercel.app'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) return callback(null, true);
        return callback(null, true);
    }
}));
app.use(helmet());

// IMPORTANTE: Limite alto para fotos
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const GOOGLE_CLIENT_ID = "517522819247-g4tut7tgkfshr4ef3ffc3gg5tj2l73rn.apps.googleusercontent.com";
const JWT_SECRET = "Mvhb@628387*";
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// --- ROTAS PÚBLICAS ---
app.get('/api/ping', (req, res) => res.status(200).json({ status: "online" }));

app.get('/api/empresas', async (req, res) => {
    const empresas = await Empresa.findAll({
        where: { slug: { [require('sequelize').Op.ne]: 'admin' } }, // Esconde o admin
        attributes: ['id', 'nome', 'slug', 'logo_url', 'cor_primaria']
    });
    res.json(empresas);
});

app.post('/api/login', async (req, res) => {
    const { email, senha } = req.body;
    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario || usuario.senha !== senha) return res.status(401).json({ erro: "Credenciais inválidas." });

    const token = jwt.sign({ id: usuario.id, role: usuario.role, empresaId: usuario.empresaId }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, role: usuario.role, foto_url: usuario.foto_url } });
});

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
        res.json({ token: appToken, usuario: { id: usuario.id, nome: usuario.nome, role: usuario.role, foto_url: usuario.foto_url } });
    } catch (e) { res.status(401).json({ erro: "Google Auth falhou." }); }
});

app.post('/api/cadastro', async (req, res) => {
    try {
        const { nome, email, senha, slug } = req.body;
        const empresa = await Empresa.findOne({ where: { slug } });
        if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada." });
        const existe = await Usuario.findOne({ where: { email } });
        if (existe) return res.status(400).json({ erro: "Email já existe." });

        const novo = await Usuario.create({ nome, email, senha, role: 'cliente', empresaId: empresa.id });
        const token = jwt.sign({ id: novo.id, role: 'cliente', empresaId: empresa.id }, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({ token, usuario: { id: novo.id, nome: novo.nome, role: 'cliente' } });
    } catch (e) { res.status(500).json({ erro: "Erro ao cadastrar." }); }
});

app.get('/api/empresa/:slug', async (req, res) => {
    const emp = await Empresa.findOne({ where: { slug: req.params.slug } });
    if (!emp) return res.status(404).json({ erro: "Não encontrada" });
    res.json({ id: emp.id, nome: emp.nome, cor_primaria: emp.cor_primaria, logo_url: emp.logo_url });
});

// --- ROTAS SUPER ADMIN ---
app.get('/api/admin/empresas', authMiddleware, AdminController.listarTodasEmpresas);
app.post('/api/admin/empresas', authMiddleware, AdminController.criarEmpresa);
app.put('/api/admin/empresas/:id/status', authMiddleware, AdminController.alterarStatus);

// --- ROTAS PRIVADAS ---
app.get('/api/agendamentos/meus', authMiddleware, AgendamentoController.listarMeusAgendamentos);
app.get('/api/agendamentos/empresa', authMiddleware, subscriptionMiddleware, AgendamentoController.listarAgendamentosEmpresa);
app.post('/api/agendar', authMiddleware, subscriptionMiddleware, AgendamentoController.criarAgendamento);

app.get('/api/equipe', authMiddleware, ConfigController.listarEquipe);
app.post('/api/equipe', authMiddleware, subscriptionMiddleware, ConfigController.adicionarMembro);
app.delete('/api/equipe/:id', authMiddleware, subscriptionMiddleware, ConfigController.removerMembro);

app.get('/api/config/horarios', authMiddleware, ConfigController.listarHorarios);
app.post('/api/config/horarios', authMiddleware, subscriptionMiddleware, ConfigController.salvarHorarios);
app.get('/api/disponibilidade', authMiddleware, ConfigController.buscarDisponibilidade);

// Rotas de Perfil e Configuração
app.put('/api/perfil', authMiddleware, ConfigController.atualizarPerfil);
app.put('/api/config/empresa', authMiddleware, subscriptionMiddleware, ConfigController.atualizarEmpresa);

app.get('/api/servicos', authMiddleware, async (req, res) => {
    const s = await Servico.findAll({ where: { empresaId: req.usuario.empresaId } });
    res.json(s);
});
app.post('/api/servicos', authMiddleware, subscriptionMiddleware, async (req, res) => {
    if (req.usuario.role !== 'dono' && req.usuario.role !== 'admin_geral') return res.status(403).json({ erro: "Proibido" });
    try {
        const dados = { ...req.body, preco: parseFloat(req.body.preco), duracao_minutos: parseInt(req.body.duracao_minutos), empresaId: req.usuario.empresaId };
        const s = await Servico.create(dados);
        res.json(s);
    } catch (e) { res.status(500).json({ erro: "Erro ao criar serviço" }); }
});
app.put('/api/servicos/:id', authMiddleware, subscriptionMiddleware, async (req, res) => {
    if (req.usuario.role !== 'dono') return res.status(403).json({ erro: "Proibido" });
    try {
        const s = await Servico.findOne({ where: { id: req.params.id } });
        if (s) {
            await s.update({ ...req.body, preco: parseFloat(req.body.preco), duracao_minutos: parseInt(req.body.duracao_minutos) });
            res.json(s);
        } else res.status(404).json({ erro: "Não encontrado" });
    } catch (e) { res.status(500).json({ erro: "Erro ao atualizar" }); }
});
app.delete('/api/servicos/:id', authMiddleware, subscriptionMiddleware, async (req, res) => {
    if (req.usuario.role !== 'dono') return res.status(403).json({ erro: "Proibido" });
    await Servico.destroy({ where: { id: req.params.id } });
    res.json({ ok: true });
});

const PORT = process.env.PORT || 3001;
database.sync({ force: false }).then(() => {
    app.listen(PORT, () => console.log(`🚀 API RODANDO NA PORTA ${PORT}`));
});