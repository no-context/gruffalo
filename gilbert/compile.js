
const {
  LR1,
} = require('./grammar')
const {
  generateStates,
  logStates,
  State,
} = require('./states')

function str(x) {
  return JSON.stringify(x)
}

function compile(grammar) {
  let states = generateStates(grammar)
  let start = states[0]

  var source = `(function(ctx) {
  return (function (lex) {

  function error(id) { throw new Error(id); }
  \n`

  for (var j = 0; j < grammar.rules.length; j++) {
    let rule = grammar.rules[j]
    source += 'function r' + rule.id + '() {\n'
    for (var i=rule.symbols.length; i--; ) {
      source += ' STACK.pop()\n'
    }
    source += ' IMMEDIATE = STACK[STACK.length - 1]\n'

    for (var i = rule.symbols.length; i--; ) {
      source += ' var c' + i + ' = NODES.pop()\n'
    }
    var children = []
    for (var i = 0; i < rule.symbols.length; i++) {
      children.push('c' + i)
    }
    if (typeof rule.build === 'function') {
      var build = rule.build.source ? rule.build.source : '' + rule.build
      source += ' var node = (' + build + ')(' + children.join(', ') + ')\n'
    } else {
      source += ' var node = [' + children.join(', ') + ']\n'
    }
    source += ' NODES.push(node)\n'
    source += ' GOTO = ' + str(rule.target) + '\n'
    source += '}\n'
  }
  source += '\n'

  states.forEach(state => {
    source += 'function g' + state.index + '() {\n'
    source += ' switch (GOTO) {\n'
    for (var symbol in state.transitions) {
      if (!grammar.isTerminal(symbol)) {
        let next = state.transitions[symbol]
        source += '  case ' + str(symbol) + ': STACK.push(g' + next.index + '); IMMEDIATE = i' + next.index + '; return\n'
      }
    }
    source += '  default: error(' + str('g' + state.index) + ')\n'
    source += ' }\n'
    // TODO signal error from inside goto()
    source += '}\n'
  })
  source += '\n'

  states.forEach(state => {
    source += 'function s' + state.index + '() {\n'
    source += ' STACK.push(g' + state.index + ')\n'
    source += ' IMMEDIATE = i' + state.index + '\n'
    source += ' NODES.push(TOKEN)\n'
    source += ' TOKEN = lex()\n'
    source += '}\n'
  })

  states.forEach(state => {
    source += 'function i' + state.index + '() {\n'

    if (state.accept) {
      source += ' if (TOKEN.type === "$") { IMMEDIATE = null; return }\n'
    }

    source += ' switch (TOKEN.type) {\n'
    if (state.reductions.length) {
      for (let item of state.reductions) {
        let lookahead = item.lookahead
        let match = lookahead == LR1.EOF ? '"$"' : str(lookahead)
        source += '  case ' + match + ': r' + item.rule.id + '(); return\n'
      }
    } else {
      for (var symbol in state.transitions) {
        let next = state.transitions[symbol]
        source += '  case ' + str(symbol) + ': s' + next.index + '(); return\n'
      }
    }
    source += '  default: error(' + state.index + ')\n'
    source += ' }\n'
    source += '}\n'
  })

  source += `
  var TOKEN = lex()
  var GOTO
  var IMMEDIATE = i0
  var NODES = []
  var STACK = [g0]
  var ACCEPT = false
  while (IMMEDIATE) {
    // console.log(IMMEDIATE.name)
    IMMEDIATE()
  }
  return NODES[0]
  \n`

  source += '})\n'
  source += '}())'

  return source
}



module.exports = {
  compile,
}

