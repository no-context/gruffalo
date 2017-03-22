
const fs = require('fs')

// const parser = require('../foo.js')



let input = fs.readFileSync('test/test1.json')
// let input = 'aa'

const { grammar, tokenizer } = require('../test/json')
const gruffalo = require('../gruffalo')

let states = gruffalo.generateStates(grammar)

// states.forEach(state => console.log(state.debug() + '\n'))

tokenizer.initString(input)
let lex = tokenizer.getNextToken.bind(tokenizer)

gruffalo.parse(states[0], lex)

