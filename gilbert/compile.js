
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


class Block {
  constructor(name, ops) {
    if (name instanceof Array) {
      ops = name
      name = 'tmp' + ++Block.highestId
    }
    this.name = name
    this.ops = ops
    if (!(ops instanceof Array)) throw new Error(JSON.stringify(ops))
  }

  resolve(lookup) {
    function resolve(block) {
      if (block.resolve) {
        block.resolve(lookup)
      } else if (typeof block === 'string' && lookup[block]) {
        block = lookup[block]
        block.resolve(lookup)
      }
      return block
    }

    for (var i = 0; i < this.ops.length; i++) {
      let op = this.ops[i]
      switch (op.action) {
        case 'jump': op.block = resolve(op.block); break
        case 'call': op.block = resolve(op.block); break
        case 'if': op.tblock = resolve(op.tblock); op.fblock = resolve(op.fblock); break
      }
    }
  }

  generate(calls) {
    if (this.ops.length === 1) {
      let first = this.ops[0]
      if (first.action === 'if') {
        let child = first.fblock.ops[0]
        if (child.action === 'if' && child.test === first.test) {
          return this.generateSwitch(calls)
        }
      }
    }

    var source = ''
    for (let op of this.ops) {
      switch (op.action) {
        case 'if':
          source += 'if (' + op.test + ' === ' + str(op.value) + ') {\n'
          source += op.tblock.generate(calls)
          source += '} else {\n'
          source += op.fblock.generate(calls)
          source += '}\n'
          break
        case 'call':
          let name = op.block.name || op.block
          //if (!op.block.name) throw JSON.stringify(op)
          calls[name] = true
          source += name + '()\n'
          break
        case 'exec':
          for (let key in op.used) {
            calls[key] = true
          }
          source += op.source
          break
        case 'jump':
          let block = op.block
          if (block.generate) {
            if (!block.generate) debugger
            source += block.generate(calls)
          } else {
            calls[op.block] = true
            source += 'return ' + op.block + '\n'
          }
          break
        case 'error':
          source += 'error(' + str(op.name) + ')\n'
          break
        default:
          throw JSON.stringify(op)
      }
    }
    return source
  }

  generateSwitch(calls) {
    var op = this.ops[0]
    let test = op.test

    var source = ''
    source += 'switch (' + test + ') {\n'

    // TODO merge cases with same target

    while (op.action === 'if' && op.test === test && op.fblock.ops.length === 1) {
      source += 'case ' + str(op.value) + ': '
      source += op.tblock.generate(calls) //.replace(/\n/g, '; ')
      source += 'break\n'
      var fblock = op.fblock
      op = fblock.ops[0] 
    }

    source += 'default: '
    source += fblock.generate(calls)

    source += '}\n'
    return source
  }
}
Block.highestId = 0

function code(source, used) {
  return { action: 'exec', source, used: used || {} }
}

/* continue with new block */
function jump(block) {
  return { action: 'jump', block }
}

/* execute block and then return here */
function call(block) {
  return { action: 'call', block }
}

function cond(test, value, tblock, fblock) {
  return { action: 'if', test, value, tblock, fblock }
}

function error(name) {
  return { action: 'error', name }
}

function reduce(rule) {
  var source = ''
  // source += 'console.log("r' + rule.id + '")\n'

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

  return new Block('r' + rule.id, [
    code(source),
  ])
}

function push(state) {
  var source = ''
  // source += 'console.log("p' + state.index + '")\n'
  source += 'STACK.push(g' + state.index + ')\n'
  source += 'NODES.push(DATA)\n'

  let used = {}
  used['g' + state.index] = true

  return new Block('p' + state.index, [
    code(source, used)
  ])
}

function specialReduce(state, rule) {
  return new Block([
    call('r' + rule.id),
    jump('STACK[STACK.length - 1]'),
  ])

  // TODO: review this
  for (var i = rule.symbols.length; i--; ) {
    let incoming = state.incoming
    if (incoming.length !== 1) {
      return new Block([
        call('r' + rule.id),
        jump('STACK[STACK.length - 1]'),
      ])
    }
    state = state.incoming[0]
  }

  // hard-code the goto
  let target = state.transitions[rule.target]
  return new Block([
    call('r' + rule.id),
    call('p' + target.index),
    jump('i' + state.index),
  ])
}

function reductions(state) {
  let exit = ''
  exit += 'DATA = TOKEN\n'
  exit += 'GOTO = TOKEN.type\n'
  exit += 'CONT = g' + state.index + '\n'

  let used = {}
  used['g' + state.index] = true
  var op = code(exit, used)

  for (let item of state.reductions) {
    let match = item.lookahead == LR1.EOF ? '$' : item.lookahead
    let body = specialReduce(state, item.rule)
    op = cond('TOKEN.type', match, body, new Block([op]))
  }

  if (state.accept) {
    op = cond('TOKEN.type', '$', new Block([call('accept')]), new Block([op]))
  }

  return new Block('i' + state.index, [ op ])
}

function go(state) {
  var op = error('g' + state.index)

  for (var symbol in state.transitions) {
    let next = state.transitions[symbol]
    op = cond('GOTO', symbol, new Block([
      call('p' + next.index),
      jump('i' + next.index),
    ]), new Block([op]))
  }

  return new Block('g' + state.index, [op])
}

function compile(grammar) {
  let states = generateStates(grammar)
  // logStates(states)
  let start = states[0]

  let blocks = {}
  function add(block) {
    blocks[block.name] = block
  }
  add(new Block('accept', [code('return null\n')]))

  for (var j = 0; j < grammar.rules.length; j++) {
    add(reduce(grammar.rules[j]))
  }

  for (var i = 0; i < states.length; i++) {
    let state = states[i]
    add(go(state))
    add(push(state))
    add(reductions(state))
  }

  for (var key in blocks) {
    blocks[key].resolve(blocks)
  }

  let functions = {}
  let calls = { 'g0': true, 'i0': true }
  for (var key in blocks) {
    let block = blocks[key]
    let source = ''
    source += 'function ' + block.name + '() {\n'
    source += block.generate(calls)
    source += '}\n'
    functions[key] = source
  }
  // TODO generate less functions?

  var source = `(function(ctx) {
  return (function (lex) {

  function error(id) { throw new Error(id); }
  \n`

  var count = 0
  for (var key in functions) {
    if (calls[key]) {
      source += functions[key]
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
      cont = cont()
    }
  } while (TOKEN.type !== '$')
  return NODES[0]
  \n`

  source += '})\n'
  source += '}())'

  console.log(source.length + ' bytes')
  // console.log(source)
  return source
}



module.exports = {
  compile,
}

