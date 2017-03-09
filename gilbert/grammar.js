
class Rule {
  constructor(target, symbols, build) {
    if (!symbols || symbols.constructor !== Array) {
      throw 'symbols must be a list'
    }
    if (typeof build !== 'function') {
      build = eval('(function (...args) { return [' + JSON.stringify(target) + ', args] })')
    }
    this.symbols = symbols
      if (symbols.length > 0 && symbols[0] === undefined) { throw new Error() }
    this.target = target
    this.build = build
    this._items = {}
    this.id = ++Rule.highestId
  }

  startItem(lookahead) {
    if (this._items[lookahead]) { return this._items[lookahead] }
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
    return this.target.toString() + ' → ' + this.symbols.join(' ')
  }

  reverse() {
    let clone = new Rule(this.target, reversed(this.symbols), null)
    clone.priority = this.priority
    clone._original = this
    return clone
  }
}
Rule.highestId = 0

class LR1 {
  constructor(rule, dot, lookahead) {
    this.id = ++LR1.highestId
    this.rule = rule
    this.wants = rule.symbols[dot]
    this.dot = dot
    this.advance = null // set by Rule
    this.lookahead = lookahead
    if (typeof lookahead !== 'string') { throw new Error(JSON.stringify(lookahead)) }
  }

  get hash() {
    return this.rule.id + '$' + this.dot
  }

  get isAccepting() {
    return this.rule.isAccepting && this.wants === undefined && this.lookahead == LR1.EOF
  }

  // TODO: test
  isRightNullable(grammar) {
    let symbols = this.rule.symbols
    for (var i = this.dot; i < symbols.length; i++) {
      if (!grammar.firstTerminalFor(symbols[i])['$null']) {
        return false
      }
    }
    return true
  }

  toString() {
    let symbols = this.rule.symbols.slice()
    symbols.splice(this.dot, 0, '•')
    let lookahead = this.lookahead === LR1.EOF ? '$' : this.lookahead
    return this.rule.target.toString() + ' → ' + symbols.map(x => x.toString()).join(' ') + ' :: ' + lookahead
  }

  wantsLookahead(grammar) {
    if (this._wlh) return this._wlh
    let after = this.rule.symbols.slice(this.dot + 1)
    let out = {}
    for (var terminal in this.lookahead) {
      let terminals = grammar.firstTerminal(after.concat(terminal))
      for (var key in terminals) {
        out[key] = true
      }
    }
    return this._wlh = out
  }
}
LR1.highestId = 0
LR1.EOF = '$'


class Grammar {
  constructor(options) {
    this.rules = []
    this.ruleSets = {} // rules by target
    this.start = options.start
    this.highestPriority = 0

    this._listFirst = {}
    this._symbolFirst = {}
  }

  static fromNearley(compiled) {
    function name(name) {
      return '$' + name
    }

    function regExp(sym) {
      // TODO regex classes
      return '/'
    }

    let g = new Grammar({ start: name(compiled.ParserStart) })
    compiled.ParserRules.forEach(r => {
      function build() {
        // TODO this is probably slow
        return r.postProcess.call(null, arguments)
      }
      let symbols = r.symbols.map(sym => sym.test ? regExp(sym) : sym.literal ? sym.literal : name(sym))
      g.add(new Rule(name(r.name), symbols, r.postProcess))
    })
    return g
  }

  add(rule) {
    this.rules.push(rule)
    if (!(rule instanceof Rule)) throw 'not a rule'
    rule.priority = ++this.highestPriority
    var set = this.ruleSets[rule.target]
    if (!set) { this.ruleSets[rule.target] = set = [] }
    set.push(rule)
  }

  get(target) {
    return this.ruleSets[target]
  }

  debug() {
    let rules = []
    Object.keys(this.ruleSets).forEach(target => {
      let ruleSet = this.ruleSets[target]
      ruleSet.forEach(rule => {
        rules.push(rule.toString())
      })
    })
    return rules.join('\n')
  }

  isTerminal(sym) {
    return !this.ruleSets[sym]
  }

  // TODO: test
  firstTerminalFor(symbol, seenRules) {
    if (this._symbolFirst[symbol]) {
      return this._symbolFirst[symbol]
    }

    let rules = this.ruleSets[symbol]
    if (!rules) { // terminal
      return { [symbol]: true }
    }

    seenRules = seenRules || {}

    let result = {}
    var hasNull = false
    for (var i = 0; i < rules.length; i++) {
      let rule = rules[i]
      if (seenRules[rule.id]) {
        continue
      }
      seenRules[rule.id] = true

      let symbols = rule.symbols
      let terminals = this.firstTerminal(symbols, seenRules)
      for (var key in terminals) {
        result[key] = true
      }

      delete seenRules[rule.id]
    }

    return this._symbolFirst[symbol] = result
  }

  // TODO: test
  firstTerminal(symbols, seenRules) {
    if (symbols.length === 0) {
      return { '$null': true }
    }

    let hash = symbols.join(', ')
    if (this._listFirst[hash]) {
      return this._listFirst[hash]
    }

    let result = {}
    for (var i = 0; i < symbols.length; i++) {
      let terminals = this.firstTerminalFor(symbols[i], seenRules)
      for (var key in terminals) {
        result[key] = true
      }
      if (!terminals['$null']) {
        break
      }
    }
    return this._listFirst[hash] = result
  }
}


module.exports = {
  Rule,
  LR1,
  Grammar,
}

