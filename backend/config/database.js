// Configuração do meu banco de dados.
// Se eu estiver na nuvem (Render), usa Postgres. Se estiver no meu PC, usa SQLite.
require('dotenv').config();
const Sequelize = require('sequelize');

let sequelize;

if (process.env.DATABASE_URL) {
    // Estou na produção (Neon/Render)
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        protocol: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        define: { timestamps: true, freezeTableName: true, underscored: true }
    });
} else {
    // Estou no meu computador local
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: './marcou_database.sqlite',
        logging: false,
        define: { timestamps: true, freezeTableName: true, underscored: true }
    });
}

module.exports = sequelize;