#! /usr/bin/env node

const koa = require('koa')
const pug = require('pug')
const screenshot = require('screenshot-stream')
const moment = require('moment')
const Rank = require('./Rank')

const app = koa()

const sprite = id => {
  const [nationalId, fornIndex] = id.split('-')
  const code = (0x1000000 | 0x159a55e5 * (
    Number(nationalId) + Number(fornIndex) * 0x10000
  ) & 0xFFFFFF).toString(16).substr(1)
  return 'https://n-3ds-pgl-contents.pokemon-gl.com/share/images/pokemon/300/' + code + '.png'
}

app.use(function * (next) {
  let type = {
    '/index.json': 'json',
    '/': 'html',
    '/index.html': 'html',
    '/index.png': 'png'
  }[this.path]
  this.assert(type, 404)
  this.response.type = type
  return yield next
})

app.use(function * (next) {
  const ranks = yield Rank.all({
    attributes: ['updated', 'pokemons'],
    order: [['updated', 'DESC']],
    limit: 2
  })
  this.assert(ranks.length > 0, 404)
  this.state.ranks = ranks.map(({pokemons, updated}) => ({pokemons, updated: moment(updated).format('YYYY / MM / DD')}))
  return yield next
})

app.use(function * (next) {
  if (this.response.is('json')) {
    this.body = this.state.ranks
  }
  return yield next
})

app.use(function * (next) {
  this.state.sprite = sprite
  this.state.body = pug.renderFile('index.pug', this.state)
  if (this.response.is('html')) {
    this.body = this.state.body
  }
  return yield next
})

app.use(function * (next) {
  if (this.response.is('png')) {
    const url = 'data:text/html,' + encodeURIComponent(this.state.body)
    this.body = screenshot(url, '320x480')
  }
  return yield next
})

Rank.sync().then(() => app.listen(process.env.PORT))
