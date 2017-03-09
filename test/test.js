
const fs = require('fs')

const gilbert = require('../gilbert')

function read(filename) {
  return fs.readFileSync(filename, 'utf-8')
}

function stringLexer(input) {
  var index = 0
  return function lex() {
    return { type: input[index++] || '$' }
  }
}


describe('compiler', () => {

  test('can parse JSON', () => {
    let { grammar, tokenizer } = require('./json')
    let p = gilbert.parserFor(grammar)
    function parse(input) {
      tokenizer.initString(input)
      let lex = tokenizer.getNextToken.bind(tokenizer)
      return p(lex)
    }

    function check(input) {
      expect(parse(input)).toEqual(JSON.parse(input))
    }

    check(read('test/test1.json'))
    check(read('test/test2.json'))
    check(read('test/sample1k.json')) // too big for expect() to handle!
  })

  test('right-nullable example', () => {
    let grammar = new gilbert.Grammar({ start: 'S' })
    grammar.add(new gilbert.Rule('S', ['a', 'S', 'A']))
    grammar.add(new gilbert.Rule('S', []))
    grammar.add(new gilbert.Rule('A', []))
    let p = gilbert.parserFor(grammar)

    let lex = stringLexer('aa')
    expect(p(lex)).toEqual(["S", [{"type":"a"}, ["S",[{"type":"a"}]]]])
  })

  test('whitespace', () => {
    let grammar = new gilbert.Grammar({ start: 'E' })
    grammar.add(new gilbert.Rule('E', ['(', '_', 'E', '_', ')'], function () { return [ arguments[2] ] }))
    grammar.add(new gilbert.Rule('E', ['1'], () => 1))
    grammar.add(new gilbert.Rule('_', []))
    grammar.add(new gilbert.Rule('_', ['_', ' '])) // TODO we have a null-reduction bug here.
    // the LR(1) parsing automaton does not enjoy (null) lookahead!
    let p = gilbert.parserFor(grammar)
    console.log(grammar.debug())

    //expect(p(stringLexer("(( (1)))"))).toEqual([[[1]]])
    expect(p(stringLexer("(( (1) ) )"))).toEqual([[[1]]])
  })

  test('tosh.ne', () => {
    let toshGrammar = require('./tosh.js')
    let grammar = gilbert.Grammar.fromNearley(toshGrammar)
    //console.log(grammar.debug())
    let p = gilbert.parserFor(grammar)

    let lex = stringLexer("say 'hello' for 10 secs")
    expect(p(lex)).toEqual(["S", [{"type":"a"}, ["S",[{"type":"a"}]]]])
  })

})
