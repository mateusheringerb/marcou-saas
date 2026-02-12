const database = require('./config/database');
const Empresa = require('./models/Empresa');
const Usuario = require('./models/Usuario');
const Servico = require('./models/Servico');
const HorarioFuncionamento = require('./models/HorarioFuncionamento');

async function seed() {
    try {
        await database.sync({ force: true });
        console.log("Banco resetado.");

        // 1. EMPRESA ADMIN (O Backoffice)
        const adminCorp = await Empresa.create({
            nome: "Backoffice Marcou",
            slug: "admin",
            cor_primaria: "#000000",
            plano: "pro",
            data_expiracao: new Date(2099, 11, 31)
        });

        // 2. SEU USUÁRIO MESTRE
        await Usuario.create({
            nome: "Mateus Admin",
            email: "mateus@admin.com", // USE ESTE EMAIL
            senha: "123",              // USE ESTA SENHA
            role: "admin_geral",
            atende_clientes: false,
            empresaId: adminCorp.id
        });

        console.log("✅ Super Admin criado: mateus@admin.com / 123");

        // 3. BARBEARIA DE EXEMPLO (Para testar o app)
        const barbearia = await Empresa.create({
            nome: "Barbearia do João",
            slug: "barbearia-joao",
            cor_primaria: "#0f172a",
            plano: "basico",
            data_expiracao: new Date(2026, 11, 31)
        });

        await Usuario.create({
            nome: "João Dono",
            email: "joao@barbearia.com",
            senha: "123",
            role: "dono",
            atende_clientes: true, // Dono que atende
            empresaId: barbearia.id
        });

        await Servico.create({ nome: "Corte", preco: 30.00, duracao_minutos: 30, empresaId: barbearia.id });

        for (let i = 0; i <= 6; i++) {
            await HorarioFuncionamento.create({
                dia_semana: i, ativo: i !== 0,
                abertura: "09:00", fechamento: "19:00",
                empresaId: barbearia.id
            });
        }

        console.log("✅ Dados de exemplo criados.");

    } catch (e) { console.error(e); }
}
seed();