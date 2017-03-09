
const {
  LR1,
} = require('./grammar')
const {
  generateStates,
  State,
} = require('./states')


class Block {
  constructor(name, ops) {
    if (name instanceof Array) {
      ops = name
      name = 'tmp' + ++Block.highestId
    }
    this.name = name
    this.ops = ops
    if (!(ops instanceof Array)) throw new Error(JSON.stringify(ops))
    if (ops[0].action === 'if' && ops.length > 1) { throw 'bad' }
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

  generate(calls, str, elidable) {
    var elidable = elidable || {}
    var source = ''
    for (let op of this.ops) {
      switch (op.action) {
        case 'if':
          source += this.generateIf(op, calls, str, elidable)
          break
        case 'call':
          if (op.block.generate) {
            source += op.block.generate(calls, str, elidable)
          } else {
            calls[op.block] = true
            source += op.block + '()\n'
          }
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
            source += block.generate(calls, str, elidable)
          } else {
            calls[op.block] = true
            source += 'return ' + op.block + '\n'
          }
          break
        case 'error':
          source += 'error("' + op.name + '")\n'
          break
        default:
          throw JSON.stringify(op)
      }
    }
    return source
  }

  generateIf(op, calls, str, elidable) {
    let fblock = op.fblock
    var child = fblock.ops[0]
    if (child.action === 'if' && child.test === op.test) {
      return this.generateSwitch(calls, str, elidable)
    }

    let cond = ''
    for (var i = 0; i < op.options.length; i++) {
      if (i > 0) { cond += ' || ' }
      cond += op.test + ' === ' + str(op.options[i])
    }

    var source = ''
    if (elidable[cond] !== undefined) {
      if (elidable[cond]) {
        source += op.tblock.generate(calls, str, elidable)
      } else {
        source += fblock.generate(calls, str, elidable)
      }
    } else {
      source += 'if (' + cond + ') {\n'
      elidable[cond] = true
      source += op.tblock.generate(calls, str, elidable)

      elidable[cond] = false
      let f = fblock.ops
      if (f.length === 1 && f[0].action === 'if') {
        source += '} else ' + fblock.generate(calls, str)
      } else {
        source += '} else {\n'
        source += fblock.generate(calls, str)
        source += '}\n'
      }
      delete elidable[op.test]
    }
    return source
  }

  generateSwitch(calls, str, elidable) {
    var op = this.ops[0]
    let test = op.test
    function isCase(op) {
      return op.action === 'if' && op.test === test
    }

    var source = ''
    source += 'switch (' + test + ') {\n'

    while (isCase(op) && op.fblock.ops.length === 1) {
      let body = op.tblock

      for (var i = 0; i < op.options.length; i++) {
        source += 'case ' + str(op.options[i]) + ': '
      }

      source += body.generate(calls, str) //.replace(/\n/g, '; ')
      source += 'break\n'

      var fblock = op.fblock
      op = fblock.ops[0]
    }

    source += 'default: '
    source += fblock.generate(calls, str)

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

function if_(test, options, tblock, fblock) {
  return { action: 'if', test, options, tblock, fblock }
}

function error(name) {
  return { action: 'error', name }
}

function reduce(rule, str) {
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
    jump('i' + target.index),
  ])
}

function reductions(state) {
  let exit = ''
  exit += 'CONT = g' + state.index + '\n'

  let used = {}
  used['g' + state.index] = true
  var op = code(exit, used)

  let rules = {}
  let jumps = {}
  for (let lookahead in state.reductions) {
    let match = lookahead == LR1.EOF ? '$' : lookahead
    for (let item of state.reductions[lookahead]) {
      let rule = item.rule
      ;(jumps[rule.id] = jumps[rule.id] || []).push(match)
      rules[rule.id] = rule
    }
  }

  for (let ruleId in jumps) {
    let body = specialReduce(state, rules[ruleId])
    op = if_('VAL', jumps[ruleId], body, new Block([op]))
  }

  if (state.accept) {
    op = if_('VAL', ['$'], new Block([call('accept')]), new Block([op]))
  }

  return new Block('i' + state.index, [ op ])
}

function go(state) {
  var op = error('g' + state.index)

  let jumps = {}
  for (var symbol in state.transitions) {
    let next = state.transitions[symbol]
    ;(jumps[next.index] = jumps[next.index] || []).push(symbol)
  }

  for (var next in jumps) {
    let body = new Block([
      call('p' + next),
      jump('i' + next),
    ])
    op = if_('GOTO', jumps[next], body, new Block([op]))
  }

  return new Block('g' + state.index, [op])
}


function compile(grammar) {
  let states = generateStates(grammar)
  // logStates(states)
  let start = states[0]

  function str(x) {
    return JSON.stringify('' + x)
  }

  let blocks = {}
  function add(block) {
    blocks[block.name] = block
  }
  add(new Block('accept', [code('return null\n')]))

  for (var j = 0; j < grammar.rules.length; j++) {
    add(reduce(grammar.rules[j], str))
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
    source += block.generate(calls, str)
    source += '}\n'
    source += '\n'
    functions[key] = source
  }
  // TODO generate less functions?

  var source = `(function (ctx) {
  'use strict';
  return function (lex) {

  function error(id) { throw new Error(id); }
  \n`

  var count = 0
  for (var key in functions) {
    if (calls[key]) {
      source += functions[key]
      count++
    }
  }
  process.stderr.write(count + ' functions generated\n')

  source += `
  var TOKEN
  var VAL
  var GOTO
  var NODES = []
  var STACK = [g0]
  var DATA
  var CONT = i0

  do {
    TOKEN = lex()
    VAL = TOKEN.type
    var cont = CONT
    CONT = null
    while (cont) {
      cont = cont()
    }
    DATA = TOKEN
    GOTO = VAL
  } while (VAL !== ${ str('$') })
  return NODES[0]
  \n`

  source += '}\n'
  source += '})\n'

  process.stderr.write(source.length + ' bytes\n')
  // console.log(source)
  return source
}



module.exports = {
  compile,
}

