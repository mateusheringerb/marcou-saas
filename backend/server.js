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

// Controladores
const AgendamentoController = require('./controllers/AgendamentoController');
const authMiddleware = require('./middlewares/authMiddleware');
const subscriptionMiddleware = require('./middlewares/subscriptionMiddleware');

const app = express();

// Configuração CORS (Permite Vercel e Localhost)
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
app.use(express.json());

// Configs
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "517522819247-g4tut7tgkfshr4ef3ffc3gg5tj2l73rn.apps.googleusercontent.com";
const JWT_SECRET = process.env.JWT_SECRET || "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";
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// --- ROTAS PÚBLICAS ---

app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        const usuario = await Usuario.findOne({ where: { email } });
        if (!usuario || usuario.senha !== senha) return res.status(401).json({ erro: "Credenciais inválidas." });

        const token = jwt.sign({ id: usuario.id, role: usuario.role, empresaId: usuario.empresaId }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, role: usuario.role } });
    } catch (e) { res.status(500).json({ erro: "Erro interno." }); }
});

app.post('/api/login/google', async (req, res) => {
    try {
        const { token, slug } = req.body;
        const ticket = await client.verifyIdToken({ idToken: token, audience: GOOGLE_CLIENT_ID });
        const { email, name } = ticket.getPayload();

        const empresa = await Empresa.findOne({ where: { slug } });
        if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada." });

        let usuario = await Usuario.findOne({ where: { email } });
        if (!usuario) {
            usuario = await Usuario.create({ nome: name, email, senha: "", role: 'cliente', empresaId: empresa.id });
        }

        const appToken = jwt.sign({ id: usuario.id, role: usuario.role, empresaId: usuario.empresaId }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token: appToken, usuario: { id: usuario.id, nome: usuario.nome, role: usuario.role } });
    } catch (e) { res.status(401).json({ erro: "Autenticação Google falhou." }); }
});

app.post('/api/cadastro', async (req, res) => {
    try {
        const { nome, email, senha, slug } = req.body;
        const empresa = await Empresa.findOne({ where: { slug } });
        if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada." });

        const existe = await Usuario.findOne({ where: { email } });
        if (existe) return res.status(400).json({ erro: "E-mail já existe." });

        const novo = await Usuario.create({ nome, email, senha, role: 'cliente', empresaId: empresa.id });
        const token = jwt.sign({ id: novo.id, role: 'cliente', empresaId: empresa.id }, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({ token, usuario: { id: novo.id, nome: novo.nome, role: 'cliente' } });
    } catch (e) { res.status(500).json({ erro: "Erro no cadastro." }); }
});

app.get('/api/empresa/:slug', async (req, res) => {
    const emp = await Empresa.findOne({ where: { slug: req.params.slug } });
    if (!emp) return res.status(404).json({ erro: "Não encontrada" });
    res.json({ id: emp.id, nome: emp.nome, cor_primaria: emp.cor_primaria, logo_url: emp.logo_url });
});

// --- ROTAS PRIVADAS ---
app.get('/api/agendamentos/meus', authMiddleware, AgendamentoController.listarMeusAgendamentos);
app.get('/api/agendamentos/empresa', authMiddleware, subscriptionMiddleware, AgendamentoController.listarAgendamentosEmpresa);
app.post('/api/agendar', authMiddleware, subscriptionMiddleware, AgendamentoController.criarAgendamento);

// CRUD de Serviços (Aqui no server.js para simplificar)
app.get('/api/servicos', authMiddleware, async (req, res) => {
    const s = await Servico.findAll({ where: { empresaId: req.usuario.empresaId } });
    res.json(s);
});
app.post('/api/servicos', authMiddleware, subscriptionMiddleware, async (req, res) => {
    if (req.usuario.role !== 'dono' && req.usuario.role !== 'admin_geral') return res.status(403).json({ erro: "Proibido" });
    const s = await Servico.create({ ...req.body, empresaId: req.usuario.empresaId });
    res.json(s);
});
app.put('/api/servicos/:id', authMiddleware, subscriptionMiddleware, async (req, res) => {
    if (req.usuario.role !== 'dono') return res.status(403).json({ erro: "Proibido" });
    const s = await Servico.findOne({ where: { id: req.params.id } });
    if (s) { await s.update(req.body); res.json(s); } else res.status(404).json({ erro: "Não encontrado" });
});
app.delete('/api/servicos/:id', authMiddleware, subscriptionMiddleware, async (req, res) => {
    if (req.usuario.role !== 'dono') return res.status(403).json({ erro: "Proibido" });
    await Servico.destroy({ where: { id: req.params.id } });
    res.json({ ok: true });
});

// Inicialização
const PORT = process.env.PORT || 3001;
database.sync({ force: false }).then(() => {
    app.listen(PORT, () => console.log(`🚀 API RODANDO NA PORTA ${PORT}`));
});