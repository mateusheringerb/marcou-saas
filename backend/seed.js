const database = require('./config/database');
const Empresa = require('./models/Empresa');
const Usuario = require('./models/Usuario');
const Servico = require('./models/Servico');
const HorarioFuncionamento = require('./models/HorarioFuncionamento');

async function seed() {
    try {
        // ATENÇÃO: FORCE TRUE APAGA TUDO. USE COM CUIDADO EM PRODUÇÃO
        await database.sync({ force: true });
        console.log("Banco resetado.");

        const emp = await Empresa.create({
            nome: "Barbearia Modelo",
            slug: "barbearia-modelo",
            cor_primaria: "#0f172a",
            plano: "pro",
            data_expiracao: new Date(2027, 1, 1)
        });

        // Cria Admin (Dono)
        await Usuario.create({
            nome: "Admin",
            email: "admin@modelo.com",
            senha: "123",
            role: "dono",
            atende_clientes: false, // Dono começa não atendendo (backoffice)
            empresaId: emp.id
        });

        // Cria Profissional Exemplo
        await Usuario.create({
            nome: "Barbeiro João",
            email: "joao@modelo.com",
            senha: "123",
            role: "profissional",
            atende_clientes: true,
            empresaId: emp.id
        });

        await Servico.create({ nome: "Corte Cabelo", descricao: "Máquina e Tesoura", preco: 35.00, duracao_minutos: 40, empresaId: emp.id });

        // Horários Padrão (Seg-Sáb 9h-18h)
        for (let i = 1; i <= 6; i++) {
            await HorarioFuncionamento.create({
                dia_semana: i, abertura: "09:00", fechamento: "19:00", almoco_inicio: "12:00", almoco_fim: "13:00", ativo: true, empresaId: emp.id
            });
        }
        // Domingo
        await HorarioFuncionamento.create({ dia_semana: 0, ativo: false, empresaId: emp.id });

        console.log("Dados criados com sucesso.");
    } catch (e) { console.error(e); }
}
seed();