require('dotenv').config();
const Sequelize = require('sequelize');

let sequelize;

if (process.env.DATABASE_URL) {
    // Produção (Render/Neon/Supabase) - PostgreSQL
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
    // Desenvolvimento (Local) - SQLite
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: './marcou_database.sqlite',
        logging: false,
        define: { timestamps: true, freezeTableName: true, underscored: true }
    });
}

module.exports = sequelize;