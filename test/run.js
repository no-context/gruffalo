
const fs = require('fs')
const gilbert = require('../gilbert')
const { grammar, tokenizer } = require('./json')

let name = process.argv[2]

let input = fs.readFileSync('test/' + name + '.json', 'utf-8')

let p = eval(gilbert.compile(grammar))
function parse(input) {
  tokenizer.initString(input)
  return p(tokenizer.getNextToken.bind(tokenizer))
}
console.log(JSON.stringify(parse(input)))
