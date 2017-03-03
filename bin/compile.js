#!/usr/bin/env node

const fs = require('fs')

const gilbert = require('../gilbert')

let { grammar, tokenizer } = require('../test/json')
let contents = gilbert.compile(grammar)
process.stdout.write(contents + '\n')

