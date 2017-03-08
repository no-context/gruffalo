
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

})
