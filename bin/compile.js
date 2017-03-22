#!/usr/bin/env node

const fs = require('fs')

const gruffalo = require('../gruffalo')

let { grammar, tokenizer } = require('../test/json')
let contents = gruffalo.compile(grammar)

let name = 'jsonParser'

process.stdout.write(
`(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
      define([], factory)
    } else if (typeof module === 'object' && module.exports) {
      module.exports = factory()
    } else {
      root.${ name } = factory()
    }
  }(this, function() {

  return ${contents}

}))
`)
