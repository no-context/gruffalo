/*
 * An LR0 parser generator.
 */

class Rule {
  constructor(target, symbols, build) {
    if (!symbols || symbols.constructor !== Array) {
      throw 'symbols must be a list'
    }
    if (typeof build !== 'function') {
      build = (...args) => [target, args]
    }
    this.symbols = symbols
    this.target = target
    this.build = build

    if (symbols.length) {
      var previous
      this.first = previous = new LR0(this, 0)
      for (var dot=1; dot<symbols.length; dot++) {
        let lr0 = new LR0(this, dot)
        previous.advance = lr0
        previous = lr0
      }
      previous.advance = new LR0(this, dot)
    } else {
      this.first = new LR0(this, 0)
    }

    this.priority = 0
  }

  toString() {
    return '<' + this.target.toString() + ' → ' + this.symbols.join(' ') + '>'
  }

  reverse() {
    let clone = new Rule(this.target, reversed(this.symbols), null)
    clone.priority = this.priority
    clone._original = this
    return clone
  }
}


class LR0 {
  constructor(rule, dot) {
    this.id = ++LR0.highestId
    this.rule = rule
    this.wants = rule.symbols[dot]
    this.dot = dot
    this.advance = null // set by Rule
  }

  toString() {
    let symbols = this.rule.symbols.slice()
    symbols.splice(this.dot, 0, '•')
    return '<' + this.rule.target.toString() + ' → ' + symbols.map(x => x.toString()).join(' ') + '>'
  }
}
LR0.highestId = 0



class Grammar {
  constructor(options) {
    this.ruleSets = {} // rules by target
    this.highestPriority = 0
  }

  add(rule) {
    if (!(rule instanceof Rule)) throw 'not a rule'
    rule.priority = ++this.highestPriority
    var set = this.ruleSets[rule.target]
    if (!set) { this.ruleSets[rule.target] = set = [] }
    set.push(rule)
  }

  get(target) {
    return this.ruleSets[target]
  }

  log() {
    let rules = []
    Object.keys(this.ruleSets).forEach(target => {
      let ruleSet = this.ruleSets[target]
      ruleSet.forEach(rule => {
        rules.push(rule.toString())
      })
    })
    console.log(rules.join('\n'))
  }
}



class State {
  constructor(grammar) {
    this.grammar = grammar
    this.items = []
    this.wants = {}
    this.index = null

    this.transitions = {}
    this.reductions = []
    this.accept = null
  }

  addItem(item) {
    this.items.push(item)
    if (item.wants === undefined) {
      if (item.rule.isAccepting) {
        this.accept = item
      } else {
        this.reductions.push(item)
      }
    } else {
      var set = this.wants[item.wants]
      if (!set) { set = this.wants[item.wants] = [] }
      set.push(item)
    }
  }

  // add closure items
  process() {
    let predicted = {}
    for (var i = 0; i < this.items.length; i++) { // nb. expands during iteration
      let item = this.items[i]
      if (item.wants !== undefined && !predicted[item.wants]) {
        predicted[item.wants] = true
        for (let rule of (this.grammar.get(item.wants) || [])) {
          this.addItem(rule.first)
        }
      }
    }
  }

  successor(symbol) {
    let next = new State(this.grammar)
    let ids = []
    for (let item of this.wants[symbol]) {
      let lr0 = item.advance
      next.addItem(lr0)
      ids.push(lr0.id)
    }
    let hash = ids.join(':')
    if (statesByHash[hash]) {
      return this.transitions[symbol] = statesByHash[hash]
    }
    if (this.transitions[symbol]) {
      throw 'oops'
    }
    next.process()
    return this.transitions[symbol] = statesByHash[hash] = next
  }

  log() {
    console.log(this.items.map(x => x.toString()).join('\n'))
  }
}

function party(g) {
  let accept = new Rule('$acc', ['E'])
  accept.isAccepting = true

  let start = new State(g)
  start.addItem(accept.first)
  statesByHash['' + accept.first.id] = start
  start.index = 0
  start.process()

  let states = [start]
  for (var i = 0; i < states.length; i++) { // nb. expands during iteration
    console.log(i)
    let state = states[i]
    state.log()

    for (let symbol in state.wants) {
      let next = state.successor(symbol)
      if (!next.index) {
        next.index = states.length
        states.push(next)
      }
      console.log(' * ', symbol, '->', next.index)
    }

    console.log()
  }
  return states
}

function log(g) {
  let states = party(g)
  let start = states[0]

  states.forEach(state => {
    console.log('s' + state.index)

    for (let item of state.items) {
      let r = item.toString()
      while (r.length < 20) { r += ' ' }

      if (item.wants === undefined) {
        if (item.rule.isAccepting) {
          r += 'accept'
        } else {
          // reduction
          r += 'reduce ' + item.rule
        }
      } else {
        r += '-> s' + state.transitions[item.wants].index
      }
      console.log(r)
    }
    console.log()
  })
}

function compile(g) {
  let states = party(g)
  let start = states[0]

  var source = ''
  source += '(function (lex) {\n'
  source += 'var token = lex()\n'
  source += 'var state = 0\n'
  source += 'var symbols = []\n'
  source += 'var stack = []\n'
  source += 'var reduce = null\n'
  source += 'var count = 0\n'
  source += 'while (true) {\n'
  source += 'console.log(stack.join(" "), state, "--", reduce || token) //, symbols)\n'
  //source += 'if (count++ > 10) break\n'
  source += 'switch (state) {\n'

  states.forEach(state => {
    source += '\n'
    source += 'case ' + state.index + ':\n'

    if (state.accept) {
      let item = state.accept
      source += '// ' + item.toString() + '\n'
      source += 'if (!token) {\n'
      source += 'console.log("accept ' + item.rule.toString() + '")\n'
      source += 'return symbols // accept\n'
      source += '}\n'
    }

    if (state.reductions.length) {
      let item = state.reductions[0]
      if (state.reductions.length > 1) { throw 'reduce-reduce conflict' }

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
      source += 'console.log("reducing ' + item.rule.toString() + '")\n'
      source += 'continue\n'

    } else {
      source += 'switch (reduce || token) {\n'
      for (var symbol in state.transitions) {
        let next = state.transitions[symbol]
        //if (set.length > 1) { throw 'shift-shift conflict?!' }
        //console.log(set)
        //let next = set[0]
        source += 'case ' + JSON.stringify(symbol) + ':\n'
        source += 'stack.push(state); state = ' + next.index + '\n'
        source += 'console.log("shift ' + symbol + '")\n'
        if (isTerminal(symbol)) {
          source += 'symbols.push(token)\n'
          source += 'token = lex(); '
          source += 'console.log("read " + token)\n'
        } else {
          source += 'reduce = null\n'
        }
        // source += 'if (reduce) {\n' // TODO we can determine this statically from symbol
        // source += '} else {\n'
        // source += '}\n'
        source += 'continue\n'
      }
      source += 'default: console.log("fail:", reduce || token); return state\n' // TODO throw unexpected token
      source += '}\n'

    }
  })
  
  source += '}\n'
  source += '}\n'
  source += '})'
  return source
}


let g = new Grammar
//g.add(new Rule('S', ['E']))
g.add(new Rule('E', ['E', '+', 'T']))
g.add(new Rule('E', ['T']))
g.add(new Rule('T', ['(', 'E', ')']))
g.add(new Rule('T', ['id']))
g.log()
console.log()

function isTerminal(x) {
  switch (x) {
    case '$acc': case 'E': case 'T': return false
    case '(': case ')': case '+': case 'id': return true
    default: throw 'wrong: ' + x
  }
}

var statesByHash = {}

var source = compile(g)
console.log(source)

var f = eval(source)

let input = ['id', '+', '(', 'id', ')']
var index = 0
function next() {
  return input[index++]
}
console.log('state', f(next))
console.log(index)

