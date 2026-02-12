// ARQUIVO: backend/server.js
// O Coração da minha API - Configurado por Mim

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const database = require('./config/database');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

// Meus Modelos (Banco de Dados)
const Empresa = require('./models/Empresa');
const Usuario = require('./models/Usuario');
const Servico = require('./models/Servico');
const Agendamento = require('./models/Agendamento');
const HorarioFuncionamento = require('./models/HorarioFuncionamento');

// Meus Controladores (Lógica de Negócio)
const AgendamentoController = require('./controllers/AgendamentoController');
const ConfigController = require('./controllers/ConfigController');
const authMiddleware = require('./middlewares/authMiddleware');
const subscriptionMiddleware = require('./middlewares/subscriptionMiddleware');

const app = express();

// --- MINHA CONFIGURAÇÃO DE SEGURANÇA (CORS) ---
// Lista de sites que eu permito acessar meu backend
const allowedOrigins = [
    'http://localhost:3000',                  // Meu ambiente local
    'https://marcou.agapeconnect.com.br',     // Meu domínio final
    'https://marcou-frontend.vercel.app'      // Minha hospedagem na Vercel
];

app.use(cors({
    origin: function (origin, callback) {
        // Permite requisições sem origem (como Postman ou Apps Mobile)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) === -1) {
            // Se não estiver na lista, bloqueia (mas em dev às vezes libero)
            return callback(null, true);
        }
        return callback(null, true);
    }
}));

app.use(helmet());
app.use(express.json());

// --- MINHAS CHAVES SECRETAS (HARDCODED COMO SOLICITADO) ---
const GOOGLE_CLIENT_ID = "517522819247-g4tut7tgkfshr4ef3ffc3gg5tj2l73rn.apps.googleusercontent.com";
const JWT_SECRET = "Mvhb@628387*";

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// --- ROTAS DE MONITORAMENTO ---
// Para o UptimeRobot não deixar meu site dormir
app.get('/api/ping', (req, res) => {
    res.status(200).json({ status: "online", time: new Date() });
});

app.get('/', (req, res) => {
    res.send('🚀 API do Marcou está rodando!');
});


// --- ROTAS PÚBLICAS (NÃO PRECISA DE LOGIN) ---

// 1. Landing Page: Lista todas as empresas parceiras
app.get('/api/empresas', async (req, res) => {
    try {
        const empresas = await Empresa.findAll({
            attributes: ['id', 'nome', 'slug', 'logo_url', 'cor_primaria']
        });
        res.json(empresas);
    } catch (e) { res.status(500).json({ erro: "Erro ao buscar empresas" }); }
});

// 2. Login com Email/Senha
app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        const usuario = await Usuario.findOne({ where: { email } });

        if (!usuario || usuario.senha !== senha) {
            return res.status(401).json({ erro: "Credenciais inválidas." });
        }

        const token = jwt.sign(
            { id: usuario.id, role: usuario.role, empresaId: usuario.empresaId },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, role: usuario.role } });
    } catch (e) { res.status(500).json({ erro: "Erro interno no login." }); }
});

// 3. Login com Google
app.post('/api/login/google', async (req, res) => {
    try {
        const { token, slug } = req.body;

        // Valido o token direto com o Google
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID
        });
        const { email, name } = ticket.getPayload();

        // Verifico a empresa
        const empresa = await Empresa.findOne({ where: { slug } });
        if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada." });

        // Busco ou crio o usuário
        let usuario = await Usuario.findOne({ where: { email } });
        if (!usuario) {
            usuario = await Usuario.create({
                nome: name,
                email,
                senha: "", // Sem senha pois é Google
                role: 'cliente',
                empresaId: empresa.id
            });
        }

        const appToken = jwt.sign(
            { id: usuario.id, role: usuario.role, empresaId: usuario.empresaId },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token: appToken, usuario: { id: usuario.id, nome: usuario.nome, role: usuario.role } });
    } catch (e) {
        console.error("Erro Google:", e);
        res.status(401).json({ erro: "Falha na autenticação Google." });
    }
});

// 4. Cadastro de Cliente (Email/Senha)
app.post('/api/cadastro', async (req, res) => {
    try {
        const { nome, email, senha, slug } = req.body;

        const empresa = await Empresa.findOne({ where: { slug } });
        if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada." });

        const existe = await Usuario.findOne({ where: { email } });
        if (existe) return res.status(400).json({ erro: "Este e-mail já está cadastrado." });

        const novo = await Usuario.create({
            nome, email, senha,
            role: 'cliente',
            empresaId: empresa.id
        });

        const token = jwt.sign(
            { id: novo.id, role: 'cliente', empresaId: empresa.id },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({ token, usuario: { id: novo.id, nome: novo.nome, role: 'cliente' } });
    } catch (e) { res.status(500).json({ erro: "Erro ao cadastrar." }); }
});

// 5. Dados públicos da Empresa (Cores, Logo)
app.get('/api/empresa/:slug', async (req, res) => {
    try {
        const emp = await Empresa.findOne({ where: { slug: req.params.slug } });
        if (!emp) return res.status(404).json({ erro: "Empresa não encontrada" });
        res.json({ id: emp.id, nome: emp.nome, cor_primaria: emp.cor_primaria, logo_url: emp.logo_url });
    } catch (e) { res.status(500).json({ erro: "Erro ao buscar empresa." }); }
});


// --- ROTAS PRIVADAS (PRECISA DE LOGIN - Token JWT) ---

// 6. Agendamentos
app.get('/api/agendamentos/meus', authMiddleware, AgendamentoController.listarMeusAgendamentos);
app.get('/api/agendamentos/empresa', authMiddleware, subscriptionMiddleware, AgendamentoController.listarAgendamentosEmpresa);
app.post('/api/agendar', authMiddleware, subscriptionMiddleware, AgendamentoController.criarAgendamento);

// 7. Gestão de Equipe (Adicionar/Remover Profissionais)
app.get('/api/equipe', authMiddleware, ConfigController.listarEquipe);
app.post('/api/equipe', authMiddleware, subscriptionMiddleware, ConfigController.adicionarMembro);
app.delete('/api/equipe/:id', authMiddleware, subscriptionMiddleware, ConfigController.removerMembro);

// 8. Configuração de Horários e Disponibilidade (Slots)
app.get('/api/config/horarios', authMiddleware, ConfigController.listarHorarios);
app.post('/api/config/horarios', authMiddleware, subscriptionMiddleware, ConfigController.salvarHorarios);
app.get('/api/disponibilidade', authMiddleware, ConfigController.buscarDisponibilidade);

// 9. CRUD de Serviços (CORRIGIDO: Converte Strings para Números)
app.get('/api/servicos', authMiddleware, async (req, res) => {
    try {
        const s = await Servico.findAll({ where: { empresaId: req.usuario.empresaId } });
        res.json(s);
    } catch (e) { res.status(500).json({ erro: "Erro ao buscar serviços." }); }
});

app.post('/api/servicos', authMiddleware, subscriptionMiddleware, async (req, res) => {
    // Apenas Dono ou Admin cria serviços
    if (req.usuario.role !== 'dono' && req.usuario.role !== 'admin_geral') {
        return res.status(403).json({ erro: "Apenas o dono pode criar serviços." });
    }

    try {
        // AQUI ESTÁ A CORREÇÃO: Garanto que preço é FLOAT e duração é INT
        const dados = {
            nome: req.body.nome,
            descricao: req.body.descricao,
            preco: parseFloat(req.body.preco),
            duracao_minutos: parseInt(req.body.duracao_minutos),
            empresaId: req.usuario.empresaId
        };

        const s = await Servico.create(dados);
        res.json(s);
    } catch (e) {
        console.error("Erro criar serviço:", e);
        res.status(500).json({ erro: "Erro ao criar serviço." });
    }
});

app.put('/api/servicos/:id', authMiddleware, subscriptionMiddleware, async (req, res) => {
    if (req.usuario.role !== 'dono') return res.status(403).json({ erro: "Proibido" });

    try {
        const s = await Servico.findOne({ where: { id: req.params.id } });
        if (s) {
            const dados = {
                ...req.body,
                preco: parseFloat(req.body.preco),
                duracao_minutos: parseInt(req.body.duracao_minutos)
            };
            await s.update(dados);
            res.json(s);
        } else {
            res.status(404).json({ erro: "Serviço não encontrado" });
        }
    } catch (e) { res.status(500).json({ erro: "Erro ao atualizar serviço" }); }
});

app.delete('/api/servicos/:id', authMiddleware, subscriptionMiddleware, async (req, res) => {
    if (req.usuario.role !== 'dono') return res.status(403).json({ erro: "Proibido" });

    try {
        await Servico.destroy({ where: { id: req.params.id } });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ erro: "Erro ao deletar." }); }
});


// --- INICIALIZAÇÃO DO SERVIDOR ---
const PORT = process.env.PORT || 3001;

// Sincroniza o banco de dados e liga o servidor
database.sync({ force: false }).then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 API do Mateus rodando na porta ${PORT}`);
    });
});