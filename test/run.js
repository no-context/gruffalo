
const fs = require('fs')
const gruffalo = require('../gruffalo')
const { grammar, tokenizer } = require('./json')

let name = process.argv[2]

let input = fs.readFileSync('test/' + name + '.json', 'utf-8')

let p = eval(gruffalo.compile(grammar))
function parse(input) {
  tokenizer.initString(input)
  return p(tokenizer.getNextToken.bind(tokenizer))
}
console.log(JSON.stringify(parse(input)))
