#! /usr/bin/env node

const koa = require('koa')
const Rank = require('./Rank')
const util = require('./util')

const app = koa()

.use(function * (next) {
  this.assert(this.path === '/', 404)
  this.assert(this.method === 'GET', 405)
  return yield next
})

.use(function * (next) {
  this.type = this.accepts('json', 'html', 'png')
  this.assert(this.type, 406)
  return yield next
})

.use(function * (next) {
  this.state = yield util.load(2)
  this.assert(this.state.length, 404)
  return yield next
})

.use(function * (next) {
  if (this.response.is('json')) {
    this.body = this.state
  } else {
    yield next
  }
})

.use(function * (next) {
  this.state = util.render(this.state)
  if (this.response.is('html')) {
    this.body = this.state
  } else {
    yield next
  }
})

.use(function * (next) {
  this.state = util.screenshot(this.state)
  if (this.response.is('png')) {
    this.body = this.state
  } else {
    yield next
  }
})

.use(function * () {
  this.throw(400)
})

Rank.sync().then(() => app.listen(process.env.PORT))
