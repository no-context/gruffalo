
const fs = require('fs')

// const parser = require('../foo.js')



// let input = fs.readFileSync('test/sample10k.json')
let input = 'aa'

// const { grammar, tokenizer } = require('../test/json')
const gilbert = require('../gilbert')

let grammar = new gilbert.Grammar({ start: '$acc' })
grammar.add(new gilbert.Rule('S', ['a', 'S', 'A']))
grammar.add(new gilbert.Rule('S', []))
grammar.add(new gilbert.Rule('A', []))

let states = gilbert.generateStates(grammar)

states.forEach(state => console.log(state.debug() + '\n'))

// tokenizer.initString(input)
// let lex = tokenizer.getNextToken.bind(tokenizer)

var index = 0
function lex() {
  return { type: input[index++] || '$' }
}

gilbert.parse(states[0], lex)

