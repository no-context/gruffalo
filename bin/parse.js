
const fs = require('fs')

// const parser = require('../foo.js')



// let input = fs.readFileSync('test/sample10k.json')
let input = 'aa'

// const { grammar, tokenizer } = require('../test/json')
const gruffalo = require('../gruffalo')

let grammar = new gruffalo.Grammar({ start: 'S' })
grammar.add(new gruffalo.Rule('S', ['a', 'S', 'A']))
grammar.add(new gruffalo.Rule('S', []))
grammar.add(new gruffalo.Rule('A', []))

let p = gruffalo.parserFor(grammar)

// states.forEach(state => console.log(state.debug() + '\n'))

// tokenizer.initString(input)
// let lex = tokenizer.getNextToken.bind(tokenizer)

var index = 0
function lex() {
  return { type: input[index++] || '$' }
}

console.log(JSON.stringify(p(lex)))

