const Empresa = require('../models/Empresa');
const moment = require('moment');

module.exports = async (req, res, next) => {
    try {
        const empresaId = req.usuario.empresaId;
        const empresa = await Empresa.findByPk(empresaId);

        if (!empresa) return res.status(404).json({ erro: "Empresa não encontrada." });

        if (empresa.status_assinatura === 'bloqueada' || empresa.status_assinatura === 'cancelada') {
            return res.status(402).json({ erro: "Serviço suspenso. Contate o suporte." });
        }

        const hoje = moment();
        const validade = moment(empresa.data_expiracao).add(3, 'days');

        if (hoje.isAfter(validade)) {
            return res.status(402).json({ erro: "Assinatura expirada." });
        }
        next();
    } catch (error) {
        return res.status(500).json({ erro: "Erro de verificação de assinatura." });
    }
};