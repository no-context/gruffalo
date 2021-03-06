
const fs = require('fs')

const gruffalo = require('../gruffalo')

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


describe('gruffalo', () => {

  test('can parse JSON', () => {
    let { grammar, tokenizer } = require('./json')
    let p = gruffalo.parserFor(grammar)
    function parse(input) {
      tokenizer.reset(input)
      let lex = tokenizer.next.bind(tokenizer)
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
    let grammar = new gruffalo.Grammar({ start: 'S' })
    grammar.add(new gruffalo.Rule('S', ['a', 'S', 'A'], (a, b, c) => [a.value, b, c]))
    grammar.add(new gruffalo.Rule('S', [])) // TODO run nullable postprocessors
    grammar.add(new gruffalo.Rule('A', []))
    let p = gruffalo.parserFor(grammar)

    let lex = stringLexer('aa')
    expect(p(lex)).toEqual(['a', ['a', undefined, undefined], undefined])
  })

  test('whitespace', () => {
    let grammar = new gruffalo.Grammar({ start: 'E' })
    grammar.add(new gruffalo.Rule('E', ['(', '_', 'E', '_', ')'], function () { return [ arguments[2] ] }))
    grammar.add(new gruffalo.Rule('E', ['1'], () => 1))
    grammar.add(new gruffalo.Rule('_', []))
    grammar.add(new gruffalo.Rule('_', ['_', ' '])) // TODO we have a null-reduction bug here.
    // the LR(1) parsing automaton does not enjoy (null) lookahead!
    let p = gruffalo.parserFor(grammar)

    expect(grammar.firstTerminalFor('_')).toEqual({ '$null': true, ' ': true })
    expect(grammar.firstTerminal(['_', ')'])).toEqual({ '$null': true, ' ': true, ')': true })

    expect(p(stringLexer("(( (1)))"))).toEqual([[[1]]])
    expect(p(stringLexer("(( (1) ) )"))).toEqual([[[1]]])
  })

  test('whitespace.ne', function() {
    let whitespace = require('./whitespace.js')
    let grammar = gruffalo.Grammar.fromNearley(whitespace)
    let p = gruffalo.parserFor(grammar)

    expect(p(stringLexer("(x)"))).toEqual(
      [ [ [ '(', null, [ [ [ [ 'x' ] ] ] ], null, ')' ] ] ]
    )
  })

  test('tosh.ne', () => {
    let toshGrammar = require('./tosh.js')
    let grammar = gruffalo.Grammar.fromNearley(toshGrammar)
    //console.log(grammar.debug())
    let p = gruffalo.parserFor(grammar)

    expect(p(stringLexer("stamp"))).toEqual(['stampCostume'])
    expect(p(stringLexer("say 2"))).toEqual(['say:', 2])
    expect(p(stringLexer("say 'hello'"))).toEqual(['say:', 'hello'])
    expect(p(stringLexer("set foo to 2 * e^ of ( foo * -0.05 + 0.5) * (1 - e ^ of (foo * -0.05 + 0.5))"))).toEqual(
      ["setVar:to:","foo",["*",["*",2,["computeFunction:of:","e ^",["+",["*",["readVariable","foo"],-0.05],0.5]]],["-",1,["computeFunction:of:","e ^",["+",["*",["readVariable","foo"],-0.05],0.5]]]]]
    )
  })

  // TODO: empty input?

})
