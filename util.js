const moment = require('moment')
const pug = require('pug')
const screenshotStream = require('screenshot-stream')
const SeasonPokemon = require('./SeasonPokemon')

exports.load = count => SeasonPokemon.all({
  attributes: ['updated', 'pokemons'],
  order: [['updated', 'DESC']],
  limit: count
})

exports.render = data => pug.renderFile('index.pug', { moment, data })

exports.screenshot = html => screenshotStream(
  `data:text/html,${encodeURIComponent(html)}`,
  '320x480'
)
