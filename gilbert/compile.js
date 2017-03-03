
const {
  LR1,
} = require('./grammar')
const {
  generateStates,
  logStates,
  State,
} = require('./states')

function str(x) {
  return JSON.stringify('' + x)
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
    source += ' DATA = (' + build + ')(' + children.join(', ') + ')\n'
  } else {
    source += ' DATA = [' + children.join(', ') + ']\n'
  }

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
  var source = ''
  source += 'STACK.push(g' + state.index + ')\n'
  source += 'NODES.push(DATA)\n'
  return {
    name: 'p' + state.index,
    source,
    exit: 'i' + state.index,
    calls: { ['g' + state.index]: true },
  }
}

function reductions(state) {
  var source = ''
  if (state.accept) {
    source += ' if (TOKEN.type === "$") { return null }\n'
  }

  let targets = {}
  for (let item of state.reductions) {
    let lookahead = item.lookahead
    let match = lookahead == LR1.EOF ? '$' : lookahead
    targets[match] = 'r' + item.rule.id
  }

  return {
    name: 'i' + state.index,
    source,
    switch: 'TOKEN.type',
    targets,
    exit: 'a' + state.index,
  }
}

function quit(state) {
  var source = ''
  source += 'DATA = TOKEN\n'
  source += 'GOTO = TOKEN.type\n'
  source += 'CONT = g' + state.index + '\n'
  return {
    name: 'a' + state.index,
    source, 
    exit: 'null',
  }
}

function body(block, lookup, used) {
  for (let key in block.calls) {
    used[key] = true
  }

  var source = ''
  if (block.source) {
    source += block.source
  }

  if (block.switch) {
    let jumps = {}
    for (var key in block.targets) {
      let cont = block.targets[key]
      ;(jumps[cont] = jumps[cont] || []).push(key)
    }

    source += 'switch (' + block.switch + ') {\n'
    for (var cont in jumps) {
      used[cont] = true
      for (var sym of jumps[cont]) {
        source += 'case ' + str(sym) + ': '
      }
      source += 'return ' + cont + '\n'
    }
    if (!block.exit) {
      source += 'default: error(' + block.name + ')\n'
    }
    source += '}\n'
  }

  if (block.exit) {
    let cont = block.exit
    if (lookup[block.exit]) {
      source += body(lookup[block.exit], lookup, used)
    } else {
      source += 'return ' + block.exit + '\n'
      used[block.exit] = true
    }
  }
  return source
}

function generate(block, lookup, used) {
  return 'function ' + block.name + '() {\n' + body(block, lookup, used) + '}\n'
}

function compile(grammar) {
  let states = generateStates(grammar)
  //logStates(states)
  let start = states[0]

  let blocks = []
  let lookup = {}

  function add(block) {
    lookup[block.name] = block
    blocks.push(block)
  }

  for (var j = 0; j < grammar.rules.length; j++) {
    add(reduce(grammar.rules[j]))
  }

  for (var i = 0; i < states.length; i++) {
    let state = states[i]
    add(go(state))
    add(push(state))
    add(reductions(state))
    add(quit(state))
  }

  let functions = {}
  let used = { 'g0': true, 'i0': true }
  for (var i = 0; i < blocks.length; i++) {
    let block = blocks[i]
    functions[block.name] = generate(block, lookup, used)
  }

  var source = `(function(ctx) {
  return (function (lex) {

  function error(id) { throw new Error(id); }
  \n`

  var count = 0
  for (var i = 0; i < blocks.length; i++) {
    let block = blocks[i]
    if (used[block.name]) {
      let func = functions[block.name]
      source += func
      count++
    }
  }
  console.log(count + ' functions generated')

  source += `
  var TOKEN
  var GOTO
  var NODES = []
  var STACK = [g0]
  var DATA
  var CONT = i0
  do {
    TOKEN = lex()
    var cont = CONT
    CONT = null
    while (cont) {
      // console.log(cont.name)
      cont = cont()
    }
  } while (TOKEN.type !== '$')
  return NODES[0]
  \n`

  source += '})\n'
  source += '}())'

  console.log(source.length + ' bytes')
  //console.log(source)
  return source
}



module.exports = {
  compile,
}

