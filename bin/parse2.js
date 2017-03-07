
const fs = require('fs')

// const parser = require('../foo.js')



let input = fs.readFileSync('test/test1.json')
// let input = 'aa'

const { grammar, tokenizer } = require('../test/json')
const gilbert = require('../gilbert')

let states = gilbert.generateStates(grammar)

// states.forEach(state => console.log(state.debug() + '\n'))

tokenizer.initString(input)
let lex = tokenizer.getNextToken.bind(tokenizer)

gilbert.parse(states[0], lex)

