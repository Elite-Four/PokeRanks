#! /usr/bin/env node

const axios = require('axios')
const co = require('co')
const debug = require('debug')('PokeRanks')
const moment = require('moment')
const querystring = require('querystring')

const Rank = require('./Rank')

const battleTeam = axios.create({
  baseURL: 'https://3ds.pokemon-gl.com/frontendApi/battleTeam',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Referer': 'https://3ds.pokemon-gl.com/'
  },
  maxContentLength: Infinity,
  maxRedirects: 0,
  transformRequest: data => querystring.stringify(data)
})
battleTeam.interceptors.response.use(response => {
  if (response.data.status_code !== '0000') {
    throw new Error(`API Error ${response.data.status_code}`)
  }
  return response
})

const MEGA_FORMS = { // 'itemId-nationalId': 'formId'
  '656-94': '1',  // Mega Gengar
  '657-282': '1', // Mega Gardevoir
  '658-181': '1', // Mega Ampharos
  '659-3': '1',  // Mega Venusaur
  '660-6': '1',  // Mega Charizard X
  '661-9': '1',  // Mega Blastoise
  '662-150': '1', // Mega Mewtwo X
  '663-150': '2', // Mega Mewtwo Y
  '664-257': '1', // Mega Blaziken
  '665-308': '1', // Mega Medicham
  '666-229': '1', // Mega Houndoom
  '667-306': '1', // Mega Aggron
  '668-354': '1', // Mega Banette
  '669-248': '1', // Mega Tyranitar
  '670-212': '1', // Mega Scizor
  '671-127': '1', // Mega Pinsir
  '672-142': '1', // Mega Aerodactyl
  '673-448': '1', // Mega Lucario
  '674-460': '1', // Mega Abomasnow
  '675-115': '1', // Mega Kangaskhan
  '676-130': '1', // Mega Gyarados
  '677-359': '1', // Mega Absol
  '678-6': '2',  // Mega Charizard Y
  '679-65': '1',  // Mega Alakazam
  '680-214': '1', // Mega Heracross
  '681-303': '1', // Mega Mawile
  '682-310': '1', // Mega Manectric
  '683-445': '1', // Mega Garchomp
  '684-380': '1', // Mega Latias
  '685-381': '1', // Mega Latios
  '752-260': '1', // Mega Swampert
  '753-254': '1', // Mega Sceptile
  '754-302': '1', // Mega Sableye
  '755-334': '1', // Mega Altaria
  '756-475': '1', // Mega Gallade
  '757-531': '1', // Mega Audino
  '758-376': '1', // Mega Metagross
  '759-319': '1', // Mega Sharpedo
  '760-80': '1',  // Mega Slowbro
  '761-208': '1', // Mega Steelix
  '762-18': '1',  // Mega Pidgeot
  '763-362': '1', // Mega Glalie
  '764-719': '1', // Mega Diancie
  '767-323': '1', // Mega Camerupt
  '768-428': '1', // Mega Lopunny
  '769-373': '1', // Mega Salamence
  '770-15': '1'   // Mega Beedrill
}

co(function * () {
  yield Rank.sync()

  debug('Fetching trending teams...')
  const { data } = yield battleTeam.post('/getBattleTeamRanking', {
    timezone: 'UTC',
    languageId: 2, // English
    battleType: 2, // Double Battle
    rankingType: 4, // Daily
    displayNumber: 255
  })

  // "updateDateFrom": "2017/01/31 00:00:00"
  const updated = moment.utc(
    data.updateDateFrom, 'YYYY/MM/DD HH:mm:ss'
  ).toDate()

  const teams = data.battleTeamRankingInfo.map(
    teamData => teamData.battleTeam.battleTeamCd
  )
  debug('Fetched %d teams, updated at %s', teams.length, updated)

  const pokemonCounts = new Map()
  for (let team of teams) {
    try {
      debug('Fetching team %s', team)
      const { data } = yield battleTeam.post('/getBattleTeamDetail', {
        languageId: 2, // English
        battleTeamCd: team
      })

      const teamCount = Number(data.battleTeam.useCount)
      debug('Team %s used %d times', team, teamCount)

      for (let pokemonData of data.pokemonList) {
        const {
          monsno: nationalId,
          itemId
        } = pokemonData
        const formIndex = MEGA_FORMS[`${itemId}-${nationalId}`] == null
          ? pokemonData.formNo
          : MEGA_FORMS[`${itemId}-${nationalId}`]
        const pokemon = `${nationalId}-${formIndex}`
        debug('Parsed Pokemon %s', pokemon)

        let pokemonCount = pokemonCounts.get(pokemon) || 0
        pokemonCount += +teamCount
        pokemonCounts.set(pokemon, pokemonCount)
      }
    } catch (e) {
      debug('Error', e)
    }
  }

  const pokemons = Array.from(pokemonCounts)
    .sort((pokemonCountA, pokemonCountB) => pokemonCountB[1] - pokemonCountA[1])

  return yield Rank.findOrCreate({
    where: { updated },
    defaults: { pokemons }
  })
}).catch(error => {
  console.error(error)
  process.exit(1)
})
