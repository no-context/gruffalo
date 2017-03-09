
const fs = require('fs')

const gilbert = require('../gilbert')

function read(filename) {
  return fs.readFileSync(filename, 'utf-8')
}

function stringLexer(input) {
  var index = 0
  return function lex() {
    let c = input[index++]
    return { type: c || '$', value: c }
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
    grammar.add(new gilbert.Rule('S', ['a', 'S', 'A'], (a, b, c) => [a.value, b, c]))
    grammar.add(new gilbert.Rule('S', [])) // TODO run nullable postprocessors
    grammar.add(new gilbert.Rule('A', []))
    let p = gilbert.parserFor(grammar)

    let lex = stringLexer('aa')
    expect(p(lex)).toEqual(['a', ['a', undefined, undefined], undefined])
  })

  test('whitespace', () => {
    let grammar = new gilbert.Grammar({ start: 'E' })
    grammar.add(new gilbert.Rule('E', ['(', '_', 'E', '_', ')'], function () { return [ arguments[2] ] }))
    grammar.add(new gilbert.Rule('E', ['1'], () => 1))
    grammar.add(new gilbert.Rule('_', []))
    grammar.add(new gilbert.Rule('_', ['_', ' '])) // TODO we have a null-reduction bug here.
    // the LR(1) parsing automaton does not enjoy (null) lookahead!
    let p = gilbert.parserFor(grammar)

    expect(grammar.firstTerminalFor('_')).toEqual({ '$null': true, ' ': true })
    expect(grammar.firstTerminal(['_', ')'])).toEqual({ '$null': true, ' ': true, ')': true })

    expect(p(stringLexer("(( (1)))"))).toEqual([[[1]]])
    expect(p(stringLexer("(( (1) ) )"))).toEqual([[[1]]])
  })

  test('tosh.ne', () => {
    let toshGrammar = require('./tosh.js')
    let grammar = gilbert.Grammar.fromNearley(toshGrammar)
    //console.log(grammar.debug())
    let p = gilbert.parserFor(grammar)

    expect(p(stringLexer("stamp"))).toEqual(['stampCostume'])
    expect(p(stringLexer("say 2"))).toEqual(['say:', 2])
    expect(p(stringLexer("say 'hello'"))).toEqual(['say:', 'hello'])
    expect(p(stringLexer("set foo to 2 * e^ of ( foo * -0.05 + 0.5) * (1 - e ^ of (foo * -0.05 + 0.5))"))).toEqual(
      ["setVar:to:","foo",["*",["*",2,["computeFunction:of:","e ^",["+",["*",["readVariable","foo"],-0.05],0.5]]],["-",1,["computeFunction:of:","e ^",["+",["*",["readVariable","foo"],-0.05],0.5]]]]]
    )
  })

})
