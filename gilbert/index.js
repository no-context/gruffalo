
const { generateStates } = require('./states')
const { parse } = require('./glr')

function parserFor(grammar) {
  let states = generateStates(grammar)
  let start = grammar.start

  // console.log(states.map(state => state.debug()).join('\n'))

  // const fs = require('fs')
  // fs.writeFileSync(grammar.start + '.bnf', grammar.debug(), 'utf-8')

  // let content = 'digraph G {\nrankdir=LR\n' + states.map(state => state.toDot()).join('\n') + '\n}'
  // fs.writeFileSync(grammar.start + '.dot', content, 'utf-8')

  return function(lex) {
    return parse(states[0], start, lex)
  }
}

module.exports = {
  Grammar: require('./grammar').Grammar,
  Rule: require('./grammar').Rule,
  compile: require('./compile').compile,
  parserFor,
}

