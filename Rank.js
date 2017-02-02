const Sequelize = require('sequelize')
const sequelize = new Sequelize(process.env.DATABASE_URL)

const Rank = sequelize.define('rank', {
  updated: {
    type: Sequelize.DATEONLY,
    primaryKey: true
  },
  pokemons: {
    type: Sequelize.JSON,
    allowNull: false
  }
})

module.exports = Rank
