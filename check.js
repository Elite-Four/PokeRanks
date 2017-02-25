#! /usr/bin/env node

const axios = require('axios')
const co = require('co')
const debug = require('debug')('PokeRanks')
const moment = require('moment')
const querystring = require('querystring')

const SeasonPokemon = require('./SeasonPokemon')
const send = require('./send')

const gbu = axios.create({
  baseURL: 'https://3ds.pokemon-gl.com/frontendApi/gbu',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Referer': 'https://3ds.pokemon-gl.com/'
  },
  maxContentLength: Infinity,
  maxRedirects: 0,
  transformRequest: data => querystring.stringify(data)
})
gbu.interceptors.response.use(response => {
  if (typeof response.data !== 'object') {
    throw Object.assign(
      Error(`Not a JSON response: ${response.data}`),
      { response }
    )
  }
  if (response.data.status_code !== '0000') {
    throw Object.assign(
      Error(`API Error: ${response.data.status_code}`),
      { response }
    )
  }
  return response
})

const check = module.exports = co.wrap(function * () {
  yield SeasonPokemon.sync()

  debug('Fetching season pokemon...')
  const { data } = yield gbu.post('/getSeasonPokemon', {
    timezone: 'UTC',
    languageId: 2, // English
    battleType: 2, // Double Battle
    seasonId: 202 // Season 2
  })

  // "updateDateFrom": "2017/01/01 00:00:00"
  const updated = moment.utc(
    data.updateDate, 'YYYY/MM/DD HH:mm:ss'
  ).toDate()

  const pokemons = data.rankingPokemonInfo.map(
    pokemon => String(pokemon.monsno) +
      (pokemon.formNo !== '0' ? `-${pokemon.formNo}` : '')
  )
  debug('Fetched season pokemon, updated on %s', updated)

  const [ , created ] = yield SeasonPokemon.findOrCreate({
    where: { updated },
    defaults: { pokemons }
  })

  if (created) {
    debug('Saved season pokemon')
    yield send()
    debug('Notice mail sent')
  } else {
    debug('Season pokemon exists')
  }
})

if (require.main === module) {
  check().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
