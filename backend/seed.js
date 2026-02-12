// Script para resetar e criar dados de teste
const database = require('./config/database');
const Empresa = require('./models/Empresa');
const Usuario = require('./models/Usuario');
const Servico = require('./models/Servico');
const HorarioFuncionamento = require('./models/HorarioFuncionamento');

async function seed() {
    try {
        await database.sync({ force: true });
        console.log("Banco resetado.");

        const emp = await Empresa.create({
            nome: "Barbearia do Gigante",
            slug: "barbearia-do-gigante",
            cor_primaria: "#1a1a1a",
            plano: "pro",
            data_expiracao: new Date(2027, 1, 1)
        });

        await Usuario.create({ nome: "Mateus Dono", email: "admin@gigante.com", senha: "123", role: "dono", empresaId: emp.id });
        await Usuario.create({ nome: "Cliente Teste", email: "cliente@gmail.com", senha: "123", role: "cliente", empresaId: emp.id });

        await Servico.create({ nome: "Corte Simples", descricao: "Apenas máquina", preco: 25.00, duracao_minutos: 30, empresaId: emp.id });

        // Horários padrão
        for (let i = 1; i <= 6; i++) {
            await HorarioFuncionamento.create({
                dia_semana: i, abertura: "09:00", fechamento: "18:00", ativo: true, empresaId: emp.id
            });
        }
        await HorarioFuncionamento.create({ dia_semana: 0, ativo: false, empresaId: emp.id });

        console.log("Dados criados com sucesso.");
    } catch (e) { console.error(e); }
}
seed();