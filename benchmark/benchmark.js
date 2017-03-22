
const fs = require('fs')
const path = require('path')


function stringLexer(input) {
  var index = 0
  return function lex() {
    let c = input[index++]
    return { type: c || '$', value: c }
  }
}


// TODO benchmark compilation


suite('json', () => {

  let jsonFile = fs.readFileSync('test/sample1k.json', 'utf-8')

  const gilbert = require('../gilbert')
  const { grammar, tokenizer } = require('../test/json')
  let jp = gilbert.parserFor(grammar)
  benchmark('gilbert', () => {
    tokenizer.reset(jsonFile)
    return jp(tokenizer.next.bind(tokenizer))
  })

  const nearley = require('nearley')
  let jsonNearleyGrammar = require('./json/nearley')
  benchmark('nearley', () => {
    let parser = new nearley.Parser(jsonNearleyGrammar)
    tokenizer.reset(jsonFile)
    let names = []
    var tok
    while ((tok = tokenizer.next()).type !== '$') {
      names.push(tok.type)
    }
    parser.feed(names)
  })

  const chev = require('./json/chevrotain')
  benchmark('chevrotain', () => {
    chev.jsonParser.input = chev.JsonLexer.tokenize(jsonFile).tokens
    chev.jsonParser.json()
  })

  // to show the futility of it all
  benchmark('JSON.parse', () => {
    JSON.parse(jsonFile)
  })

})


suite('tosh', () => {

  let toshFile = 'set foo to 2 * e^ of ( foo * -0.05 + 0.5) * (1 - e ^ of (foo * -0.05 + 0.5))'
  let toshNearleyGrammar = require('../test/tosh')

  const gilbert = require('../gilbert')
  let toshGrammar = gilbert.Grammar.fromNearley(toshNearleyGrammar)
  let p = gilbert.parserFor(toshGrammar)
  benchmark('gilbert', () => {
    return p(stringLexer(toshFile))
  })

  const nearley = require('nearley')
  benchmark('nearley', () => {
    let parser = new nearley.Parser(toshNearleyGrammar)
    parser.feed(toshFile)
    parser.results
  })

})
