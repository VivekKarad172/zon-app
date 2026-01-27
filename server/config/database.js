const { Sequelize } = require('sequelize');
const path = require('path');

const isPostgres = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres');

const sequelize = isPostgres
  ? new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  })
  : new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', 'database.sqlite'),
    logging: false
  });

module.exports = sequelize;
