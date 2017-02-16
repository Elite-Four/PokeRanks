#! /usr/bin/env node

const co = require('co')
const debug = require('debug')('PokeRanks')
const nodemailer = require('nodemailer')
const os = require('os')

const util = require('./util')

const transporter = nodemailer.createTransport({
  direct: true
}, {
  from: `PokeRanks <pokeranks@${os.hostname()}>`,
  to: process.env.MAIL_TO,
  subject: process.env.MAIL_SUBJECT
})

const send = module.exports = co.wrap(function * () {
  const data = yield util.load(2)
  const html = util.render(data)
  const image = util.screenshot(html)
  const result = yield transporter.sendMail({
    html,
    attachments: [
      {
        filename: 'pokeranks.png',
        content: image
      }
    ]
  })
  debug('Mail sent', result)
})

if (require.main === module) {
  send().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
