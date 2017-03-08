
const { generateStates } = require('./states')
const { parse } = require('./glr')

function parserFor(grammar) {
  let states = generateStates(grammar)
  let start = grammar.start
  // states.forEach(state => console.log(state.debug() + '\n'))

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

