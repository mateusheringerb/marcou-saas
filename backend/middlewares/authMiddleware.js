const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || "Mvhb@628387*";

module.exports = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ erro: "Token não fornecido." });

    jwt.verify(token, SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ erro: "Token inválido." });
        req.usuario = decoded;
        next();
    });
};