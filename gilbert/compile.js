
const {
  LR1,
} = require('./grammar')
const {
  generateStates,
  State,
} = require('./states')


function compile(grammar) {
  let states = generateStates(grammar)
  // log(states)
  let start = states[0]

  var source = ''
  source += '(function (lex) {\n'
  source += 'var token = lex()\n'
  source += 'var nextToken = lex()\n'
  source += 'var state = 0\n'
  source += 'var nodes = []\n'
  source += 'var stack = []\n'
  source += 'var count = 0\n'
  source += '\n'

  for (var j = 0; j < grammar.rules.length; j++) {
    let rule = grammar.rules[j]
    source += 'function r' + rule.id + '() {\n'
    source += 'var children = []\n'
    for (var i=rule.symbols.length; i--; ) {
      source += 'state = stack.pop()\n'
    }
    for (var i=rule.symbols.length; i--; ) {
      source += 'children[' + i + '] = nodes.pop()\n'
    }
    // TODO call reduce processor
    source += 'nodes.push(children)\n'
    source += 'go(' + JSON.stringify(rule.target) + ')\n'
    source += '}\n'
  }
  source += '\n'

  source += 'function go(symbol) {\n'
  source += 'switch (state) {\n'
  states.forEach(state => {
    if (!state.reductions.length) {
      source += 'case ' + state.index + ':\n'
      source += 'switch (symbol) {\n'
      for (var symbol in state.transitions) {
        if (!grammar.isTerminal(symbol)) {
          let next = state.transitions[symbol]
          source += 'case ' + JSON.stringify(symbol) + ': '
          source += 'stack.push(state); state = ' + next.index + '; return\n'
        }
      }
      source += '}'
    }
  })
  source += '}'
  source += 'console.log("goto fail: " + symbol)\n'
  // TODO signal error from inside goto()
  source += '}'
  source += '\n'

  states.forEach(state => {
    source += 'function s' + state.index + '() {\n'
    source += 'stack.push(state)\n'
    source += 'state = ' + state.index + '\n'
    source += 'nodes.push(token.value)\n'
    source += 'token = nextToken\n'
    source += 'nextToken = lex()\n'
    source += '}\n'

  })

  source += 'while (true) {\n'
  source += 'switch (state) {\n'

  states.forEach(state => {
    source += '\n'
    source += 'case ' + state.index + ':\n'

    if (state.accept) {
      source += 'if (token.type === "$") { return nodes }\n'
    }

    if (state.reductions.length) {
      source += 'switch (token.type) {\n'
      for (let item of state.reductions) {
        let lookahead = item.lookahead
        let match = lookahead == LR1.EOF ? '"$"' : JSON.stringify(lookahead)
        source += 'case ' + match + ': r' + item.rule.id + '(); continue\n'
      }
      source += 'default: console.log("reduce fail: did not expect " + JSON.stringify(token.type)); return state\n'
      source += '}\n'

    } else {
      source += 'switch (token.type) {\n'
      for (var symbol in state.transitions) {
        let next = state.transitions[symbol]
        source += 'case ' + JSON.stringify(symbol) + ': s' + next.index + '(); continue\n'
      }
      source += 'default: console.log("fail:", token.type); return state\n' // TODO throw unexpected token
      source += '}\n'

    }
  })
  
  source += '}\n'
  source += '}\n'
  source += '})'
  return source
}



module.exports = {
  compile,
}

