
/*
 * An LR(1) parser generator.
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
    this._items = {}
  }

  startItem(lookahead) {
    if (this._items[lookahead.join(', ')]) { return this._items[lookahead] }
    let symbols = this.symbols
    if (!symbols.length) {
      return this._items[lookahead] = new LR1(this, 0, lookahead)
    }
    var previous
    var first = previous = new LR1(this, 0, lookahead)
    for (var dot=1; dot<symbols.length; dot++) {
      let lr0 = new LR1(this, dot, lookahead)
      previous.advance = lr0
      previous = lr0
    }
    previous.advance = new LR1(this, dot, lookahead)
    return this._items[lookahead] = first
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

class LR1 {
  constructor(rule, dot, lookahead) {
    this.id = ++LR1.highestId
    this.rule = rule
    this.wants = rule.symbols[dot]
    this.dot = dot
    this.advance = null // set by Rule
    this.lookahead = lookahead
  }

  get isAccepting() {
    return this.rule.isAccepting && this.lookahead == LR1.EOF
  }

  toString() {
    let symbols = this.rule.symbols.slice()
    symbols.splice(this.dot, 0, '•')
    let lookahead = this.lookahead == LR1.EOF ? '$' : this.lookahead
    return this.rule.target.toString() + ' → ' + symbols.map(x => x.toString()).join(' ') + ' ;  ' + lookahead
  }
}
LR1.highestId = 0
LR1.EOF = '$EOF'


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

  isTerminal(sym) {
    return !this.ruleSets[sym]
  }

  // TODO memoize
  firstTerminalFor(symbol) {
    let rules = this.ruleSets[symbol]
    if (!rules) { // terminal
      return [symbol]
    }

    let result = []
    var hasNull = false
    for (var i = 0; i < rules.length; i++) {
      let symbols = rules[i].symbols
      let terminals = this.firstTerminal(symbols)
      var j = 0
      if (terminals[0] === null) {
        j++
        if (!hasNull) {
          result = [null].concat(result)
        } else {
          hasNull = true
        }
      }
      for ( ; j < terminals.length; j++) {
        result.push(terminals[j])
      }
    }
    return result
  }

  firstTerminal(symbols) {
    if (symbols.length === 0) {
      return null
    }

    let result = []
    for (var i = 0; i < symbols.length; i++) {
      let terminals = this.firstTerminalFor(symbols[i])
      if (terminals[0] === null) {
        if (result.length === 0) { result.push(null) }
        for (var j = 1; j < terminals.length; j++) {
          result.push(terminals[j])
        }
        continue
      }
      for (var j = 0; j < terminals.length; j++) {
        result.push(terminals[j])
      }
      break
    }
    return result
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
    if (!(item instanceof LR1)) { throw new Error('not an LR1') }
    this.items.push(item)
    if (item.wants === undefined) {
      if (item.isAccepting) {
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
    let grammar = this.grammar
    let predicted = {}
    for (var i = 0; i < this.items.length; i++) { // nb. expands during iteration
      let item = this.items[i]
      if (item.wants !== undefined && !predicted[item.wants]) {
        predicted[item.wants] = true
        for (let rule of (grammar.get(item.wants) || [])) {
          let after = item.rule.symbols.slice(item.dot + 1)
          let lookahead = grammar.firstTerminal(after.concat([item.lookahead]))
          this.addItem(rule.startItem(lookahead))
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
  let accept = new Rule('$acc', ['S'])
  accept.isAccepting = true

  let start = new State(g)
  let startItem = accept.startItem([LR1.EOF])
  start.addItem(startItem)
  statesByHash['' + startItem.id] = start
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

function log(states) {
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

function compile(grammar) {
  let states = party(grammar)
  log(states)
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
      source += 'switch (nextToken) {\n'
      for (let item of state.reductions) {
        for (let lookahead of item.lookahead) {
          let match = lookahead == LR1.EOF ? 'undefined' : JSON.stringify(lookahead)
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
          source += 'console.log("reducing ' + item.rule.toString() + '")\n'
          source += 'continue\n'
        }
      }
      source += 'default: console.log("reduce fail"); return state\n'
      source += '}\n'

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
        if (grammar.isTerminal(symbol)) {
          source += 'symbols.push(token)\n'
          source += 'token = nextToken; '
          source += 'nextToken = lex(); '
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
g.add(new Rule('S', ['X', 'X']))
g.add(new Rule('X', ['a', 'X']))
g.add(new Rule('X', ['b']))
g.log()
console.log()

var statesByHash = {}

var source = compile(g)
console.log(source)

var f = eval(source)

let input = Array.from('baab')
var index = 0
function next() {
  return input[index++]
}
console.log(pretty(f(next)))
console.log(index)

function pretty(s) {
  if (s && s instanceof Array) {
    return '[ ' + s.map(pretty).join(' ') + ' ]'
  }
  return '' + s
}

