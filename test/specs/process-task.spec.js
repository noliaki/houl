'use strict'

const Config = require('../../lib/models/config')
const processTask = require('../../lib/process-task')

const helpers = require('../helpers')
const vinyl = helpers.vinyl
const source = helpers.source
const transform = helpers.transform
const assertStream = helpers.assertStream

describe('ProcessTask Stream', () => {
  it('passes through files that does not match any rules', done => {
    const config = new Config({
      rules: {
        js: 'js'
      }
    }, {
      js: () => { throw new Error('Unexpected') }
    })

    source([
      vinyl({ path: 'test.css', contents: '' })
    ]).pipe(processTask(config))
      .pipe(assertStream([
        vinyl({ path: 'test.css', contents: '' })
      ]))
      .on('finish', done)
  })

  it('transforms file by matched task', done => {
    const config = new Config({
      rules: {
        es6: {
          task: 'js',
          outputExt: 'js'
        },
        scss: {
          task: 'css',
          outputExt: 'css'
        }
      }
    }, {
      js: stream => stream.pipe(transform((file, encoding, done) => {
        file.contents = Buffer.from('es6: ' + file.contents)
        done(null, file)
      })),
      css: stream => stream.pipe(transform((file, encoding, done) => {
        file.contents = Buffer.from('scss: ' + file.contents)
        done(null, file)
      }))
    })

    source([
      vinyl({ path: 'test.es6', contents: 'const test = "es6"' }),
      vinyl({ path: 'test.scss', contents: '.foo {}' })
    ]).pipe(processTask(config))
      .pipe(assertStream([
        vinyl({ path: 'test.js', contents: 'es6: const test = "es6"' }),
        vinyl({ path: 'test.css', contents: 'scss: .foo {}' })
      ]))
      .on('finish', done)
  })

  it('ignores files that is matched with exclude option', done => {
    const config = new Config({
      rules: {
        es6: {
          task: 'js',
          outputExt: 'js',
          exclude: '**/vendor/**'
        }
      }
    }, {
      js: stream => stream.pipe(transform((file, encoding, done) => {
        file.contents = Buffer.from('es6: ' + file.contents)
        done(null, file)
      }))
    })

    source([
      vinyl({ path: 'test.es6', contents: 'const test = "test"' }),
      vinyl({ path: 'vendor/test.es6', contents: 'const test = "vendor"' })
    ]).pipe(processTask(config))
      .pipe(assertStream([
        vinyl({ path: 'test.js', contents: 'es6: const test = "test"' }),
        vinyl({ path: 'vendor/test.es6', contents: 'const test = "vendor"' })
      ]))
      .on('finish', done)
  })

  it('transforms extname after executing task', done => {
    let called = false
    const config = new Config({
      rules: {
        es6: {
          task: 'js',
          outputExt: 'js'
        }
      }
    }, {
      js: stream => stream.pipe(transform((file, encoding, done) => {
        expect(file.extname).toBe('.es6')
        called = true
        done(null, file)
      }))
    })

    source([
      vinyl({ path: 'test.es6' })
    ]).pipe(processTask(config))
      .pipe(assertStream([
        vinyl({ path: 'test.js' })
      ]))
      .on('finish', () => {
        expect(called).toBe(true)
        done()
      })
  })
})
