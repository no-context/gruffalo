
const {
  LR1,
} = require('./grammar')
const {
  generateStates,
  logStates,
  State,
} = require('./states')


function compile(grammar) {
  let states = generateStates(grammar)
  let start = states[0]

  var source = ''
  source += '(function (lex) {\n'
  source += '\n'

  source += 'function error(id) { throw new Error(id); }\n'
  source += '\n'

  for (var j = 0; j < grammar.rules.length; j++) {
    let rule = grammar.rules[j]
    source += 'function r' + rule.id + '() {\n'
    source += ' var children = []\n'
    for (var i=rule.symbols.length; i--; ) {
      source += ' STACK.pop()\n'
    }
    source += ' IMMEDIATE = STACK[STACK.length - 1]\n'
    for (var i=rule.symbols.length; i--; ) {
      source += ' children[' + i + '] = NODES.pop()\n'
    }
    // TODO call reduce processor
    source += ' NODES.push(children)\n'
    source += ' GOTO = ' + JSON.stringify(rule.target) + '\n'
    source += '}\n'
  }
  source += '\n'

  states.forEach(state => {
    // if (!Object.keys(state.transitions).length) {
    //   source += 'var g' + state.index + ' = error.bind(null, ' + JSON.stringify('g' + state.index) + ')\n'
    // } else {
    source += 'function g' + state.index + '() {\n'
    source += ' switch (GOTO) {\n'
    for (var symbol in state.transitions) {
      if (!grammar.isTerminal(symbol)) {
        let next = state.transitions[symbol]
        source += '  case ' + JSON.stringify(symbol) + ': STACK.push(g' + next.index + '); IMMEDIATE = i' + next.index + '; return\n'
      }
    }
    source += '  default: error(' + JSON.stringify('g' + state.index) + ')\n'
    source += ' }\n'
    // TODO signal error from inside goto()
    source += '}\n'
  })
  source += '\n'

  states.forEach(state => {
    source += 'function s' + state.index + '() {\n'
    source += ' STACK.push(g' + state.index + ')\n'
    source += ' IMMEDIATE = i' + state.index + '\n'
    source += ' NODES.push(TOKEN.value)\n'
    source += ' TOKEN = NEXT\n'
    source += ' NEXT = lex()\n'
    source += '}\n'
  })

  states.forEach(state => {
    source += 'function i' + state.index + '() {\n'

    if (state.accept) {
      source += ' if (TOKEN.type === "$") { IMMEDIATE = null; return }\n'
    }

    if (state.reductions.length) {
      source += ' switch (TOKEN.type) {\n'
      for (let item of state.reductions) {
        let lookahead = item.lookahead
        let match = lookahead == LR1.EOF ? '"$"' : JSON.stringify(lookahead)
        source += '  case ' + match + ': r' + item.rule.id + '(); return\n'
      }
      source += '  default: error(' + state.index + ')\n'
      source += ' }\n'
    } else {
      source += ' switch (TOKEN.type) {\n'
      for (var symbol in state.transitions) {
        let next = state.transitions[symbol]
        source += '  case ' + JSON.stringify(symbol) + ': s' + next.index + '(); return\n'
      }
      source += '  default: error(' + state.index + ')\n'
      source += ' }\n'
    }
    source += '}\n'
  })
  source += '\n'
  
  source += 'var TOKEN = lex()\n'
  source += 'var GOTO\n'
  source += 'var NEXT = lex()\n'
  source += 'var IMMEDIATE = i0\n'
  source += 'var NODES = []\n'
  source += 'var STACK = [g0]\n'
  source += 'var ACCEPT = false\n'
  source += 'while (IMMEDIATE) {\n'
  //source += 'console.log(IMMEDIATE.name)\n'
  source += 'IMMEDIATE()\n'
  source += '}\n'
  source += 'return NODES\n'
  source += '})'
  // console.log(source)
  return source
}



module.exports = {
  compile,
}

