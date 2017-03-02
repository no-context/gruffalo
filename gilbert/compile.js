
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
  source += 'var symbols = []\n'
  source += 'var stack = []\n'
  source += 'var reduce = null\n'
  source += 'var count = 0\n'
  source += 'while (true) {\n'
  // source += 'console.log(stack.join(" "), state, "--", reduce || token.type) //, symbols)\n'
  source += 'switch (state) {\n'

  states.forEach(state => {
    source += '\n'
    source += 'case ' + state.index + ':\n'

    if (state.accept) {
      let item = state.accept
      source += '// ' + item.toString() + '\n'
      source += 'if (token.type === "$") {\n'
      // source += 'console.log("accept ' + item.rule.toString() + '")\n'
      source += 'return symbols // accept\n'
      source += '}\n'
    }

    if (state.reductions.length) {
      source += 'switch (token.type) {\n'
      for (let item of state.reductions) {
        let lookahead = item.lookahead
        let match = lookahead == LR1.EOF ? '"$"' : JSON.stringify(lookahead)
        source += 'case ' + match + ':\n'
        source += '// ' + item.toString() + ' -- reduce\n'
        source += 'var children = []\n'
        for (var i=item.rule.symbols.length; i--; ) {
          source += 'state = stack.pop()\n'
        }
        for (var i=item.rule.symbols.length; i--; ) {
          source += 'children[' + i + '] = symbols.pop()\n'
        }
        source += 'symbols.push(children)\n'
        source += 'reduce = ' + JSON.stringify(item.rule.target) + '\n'
        // source += 'console.log("reducing ' + item.rule.toString() + '")\n'
        source += 'continue\n'
      }
      source += 'default: console.log("reduce fail: did not expect " + JSON.stringify(token.type)); return state\n'
      source += '}\n'

    } else {
      source += 'switch (reduce || token.type) {\n'
      for (var symbol in state.transitions) {
        let next = state.transitions[symbol]
        source += 'case ' + JSON.stringify(symbol) + ':\n'
        source += 'stack.push(state); state = ' + next.index + '\n'
        // source += 'console.log("shift ' + symbol + '")\n'
        if (grammar.isTerminal(symbol)) {
          source += 'symbols.push(token.value)\n'
          source += 'token = nextToken; '
          source += 'nextToken = lex(); '
          // source += 'console.log("read " + token.type + " `" + token.value + "`")\n'
        } else {
          source += 'reduce = null\n'
        }
        source += 'continue\n'
      }
      source += 'default: console.log("fail:", reduce || token.type); return state\n' // TODO throw unexpected token
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

