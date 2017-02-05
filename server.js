#! /usr/bin/env node

const koa = require('koa')
const pug = require('pug')
const screenshot = require('screenshot-stream')
const moment = require('moment')
const Rank = require('./Rank')

const app = koa()

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
  this.state.ranks = ranks
  return yield next
})

app.use(function * (next) {
  if (this.response.is('json')) {
    this.body = this.state.ranks
  }
  return yield next
})

app.use(function * (next) {
  this.state.moment = moment
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
