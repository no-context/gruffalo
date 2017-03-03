
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


function reduce(rule) {
  var source = ''

  for (var i=rule.symbols.length; i--; ) {
    source += ' STACK.pop()\n'
  }

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

  return {
    name: 'r' + rule.id,
    source,
    exit: 'STACK[STACK.length - 1]',
  }
}

function go(state) {
  let targets = {}
  for (var symbol in state.transitions) {
    let next = state.transitions[symbol]
    targets[symbol] = 'p' + next.index
  }
  return {
    name: 'g' + state.index,
    switch: 'GOTO',
    targets,
  }
}

function push(state) {
  return {
    name: 'p' + state.index,
    source: 'STACK.push(g' + state.index + ')\n',
    exit: 'i' + state.index,
  }
}

function next(state) {
  var source = ''

  if (state.accept) {
    source += ' if (TOKEN.type === "$") { return null }\n'
  }

  source += ' switch (TOKEN.type) {\n'
  for (let item of state.reductions) {
    let lookahead = item.lookahead
    let match = lookahead == LR1.EOF ? '"$"' : str(lookahead)
    source += '  case ' + match + ': return r' + item.rule.id + '\n'
  }
  for (var symbol in state.transitions) {
    let next = state.transitions[symbol]
    source += '  case ' + str(symbol) + ': read(); return p' + next.index + '\n'
  }
  source += '  default: error(' + state.index + ')\n'
  source += ' }\n'

  return {
    name: 'i' + state.index,
    source,
  }
}

function compile(grammar) {
  let states = generateStates(grammar)
  let start = states[0]

  var blocks = []

  function add(block) {
    blocks.push(block)
  }

  for (var j = 0; j < grammar.rules.length; j++) {
    add(reduce(grammar.rules[j]))
  }

  for (var i = 0; i < states.length; i++) {
    let state = states[i]
    add(go(state))
    add(push(state))
    add(next(state))
  }

  var source = `(function(ctx) {
  return (function (lex) {

  function error(id) { throw new Error(id); }
  \n`

  for (var i = 0; i < blocks.length; i++) {
    let block = blocks[i]
    source += 'function ' + block.name + '() {\n'
    if (block.source) {
      source += block.source
    }
    if (block.exit) {
      source += 'return ' + block.exit + '\n'
    } else if (block.switch) {
      source += 'switch (' + block.switch + ') {\n'
      for (var key in block.targets) {
        source += 'case ' + str(key) + ': return ' + block.targets[key] + '\n'
      }
      source += 'default: error(' + block.name + ')\n'
      source += '}\n'
    }
    source += '}\n'
  }

  source += `
  function read() {
    NODES.push(TOKEN);
    TOKEN = lex();
  }

  var TOKEN = lex()
  var GOTO
  var cont = i0
  var NODES = []
  var STACK = [g0]
  var ACCEPT = false
  var COLUMN = []
  var NEXT = []
  while (cont) {
    cont = cont()
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

