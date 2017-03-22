
const fs = require('fs')
const path = require('path')


function stringLexer(input) {
  var index = 0
  return function lex() {
    let c = input[index++]
    return { type: c || '$', value: c }
  }
}


suite('compile JSON', () => {

  const gruffalo = require('../gruffalo')
  const jsonGrammar = require('../test/json').grammar

  const states = require('../gruffalo/states')
  benchmark('generateStates', () => {
    states.generateStates(jsonGrammar)
  })

  const lr1 = require('../gruffalo/lr1')
  benchmark('lr1 + generateStates', () => {
    lr1.compile(jsonGrammar)
  })

  // TODO GLR compiler

})


suite('compile tosh', () => {

  const gruffalo = require('../gruffalo')
  const toshGrammar = gruffalo.Grammar.fromNearley(require('../test/tosh'))

  const states = require('../gruffalo/states')
  benchmark('generateStates', () => {
    states.generateStates(toshGrammar)
  })

  // TODO GLR compiler

})


suite('json', () => {

  let jsonFile = fs.readFileSync('test/sample1k.json', 'utf-8')

  const gruffalo = require('../gruffalo')
  const { grammar, tokenizer } = require('../test/json')
  let jp = gruffalo.parserFor(grammar)
  benchmark('gruffalo', () => {
    tokenizer.reset(jsonFile)
    jp(tokenizer.next.bind(tokenizer))
  })

  const lr1 = require('../gruffalo/lr1')
  let pl = eval(lr1.compile(grammar))({})
  benchmark('lr1', () => {
    tokenizer.reset(jsonFile)
    var x = pl(tokenizer.next.bind(tokenizer))
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
  /*
  benchmark('JSON.parse', () => {
    JSON.parse(jsonFile)
  })
  */

})


suite('tosh', () => {

  let toshFile = 'set foo to 2 * e^ of ( foo * -0.05 + 0.5) * (1 - e ^ of (foo * -0.05 + 0.5))'
  const toshNearleyGrammar = require('../test/tosh')

  const gruffalo = require('../gruffalo')
  let toshGrammar = gruffalo.Grammar.fromNearley(toshNearleyGrammar)
  let p = gruffalo.parserFor(toshGrammar)
  benchmark('gruffalo', () => {
    return p(stringLexer(toshFile))
  })

  const nearley = require('nearley')
  benchmark('nearley', () => {
    let parser = new nearley.Parser(toshNearleyGrammar)
    parser.feed(toshFile)
    parser.results
  })

})
