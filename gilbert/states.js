
const {
  Rule,
  LR1,
  Grammar
} = require('./grammar')


class State {
  constructor(grammar) {
    this.grammar = grammar
    this.items = []
    this.wants = {}
    this.index = null

    this.transitions = {}
    this.reductions = {}
    // TODO separate nullReductions
    this.accept = null
    this.incoming = []
  }

  addItem(item) {
    if (!(item instanceof LR1)) { throw new Error('not an LR1') }
    this.items.push(item)
    if (item.isAccepting) {
      this.accept = item
    }
    if (item.isRightNullable(this.grammar)) {
      // LR1 is complete, or right nullable after dot
      let set = this.reductions[item.lookahead] = this.reductions[item.lookahead] || []
      set.push(item)
    }
    if (item.wants !== undefined) {
      var set = this.wants[item.wants]
      if (!set) { set = this.wants[item.wants] = [] }
      set.push(item)
    }
  }

  // add closure items
  process() {
    let grammar = this.grammar
    let items = this.items
    let predicted = {}
    for (var i = 0; i < items.length; i++) { // nb. expands during iteration
      let item = items[i]
      if (item.wants === undefined) {
        continue
      }

      let after = item.rule.symbols.slice(item.dot + 1)
      let lookahead = grammar.firstTerminal(after.concat([item.lookahead]))

      // TODO do reductions with $null lookahead always apply?

      var spawned = predicted[item.wants]
      if (!spawned) { spawned = predicted[item.wants] = {} }

      for (var key in lookahead) {
        if (key === '$null') { continue }
        if (!spawned[key]) {
          let newItems = spawned[key] = []
          for (let rule of (grammar.get(item.wants) || [])) {
            let pred = rule.startItem(key)
            this.addItem(pred)
            newItems.push(pred)
          }
        }
      }
    }
  }

  successor(symbol, statesByHash) {
    let next = new State(this.grammar)
    next.incoming = [this]
    let ids = []
    for (let item of this.wants[symbol]) {
      let lr0 = item.advance
      next.addItem(lr0)
      ids.push(lr0.id)
    }
    let hash = ids.join(':')
    if (statesByHash[hash]) {
      statesByHash[hash].incoming.push(this)
      return this.transitions[symbol] = statesByHash[hash]
    }
    if (this.transitions[symbol]) {
      throw 'oops'
    }
    next.process()
    return this.transitions[symbol] = statesByHash[hash] = next
  }

  debug() {
    // return this.items.map(x => x.toString()).join('\n')
    var r = ''
    r += 's' + this.index + '\n'
    for (let lookahead in this.reductions) {
      for (let item of this.reductions[lookahead]) {
        r += '  [' + lookahead + '] -> reduce <' + item.rule + '> ' + item.dot + '\n'
      }
    }
    for (let match in this.transitions) {
      r += '  [' + match + '] -> push s' + this.transitions[match].index + '\n'
    }

    for (let item of this.items) {
      r += item.toString() + '\n'

      if (item.rule.isAccepting) {
        r += '  [$] -> accept\n'
      }
    }
    return r
  }
}


function generateStates(g) {
  if (g.start === undefined) {
    throw new Error('grammar needs a start non-terminal')
  }

  // TODO: $acc ignores this processor
  let accept = new Rule('$acc', [g.start], x => x)
  accept.isAccepting = true

  let start = new State(g)
  let startItem = accept.startItem(LR1.EOF)
  start.addItem(startItem)
  let statesByHash = { ['' + startItem.id]: start }
  start.index = 0
  start.process()

  let states = [start]
  for (var i = 0; i < states.length; i++) { // nb. expands during iteration
    // console.log(i)
    let state = states[i]
    // state.log()

    for (let symbol in state.wants) {
      let next = state.successor(symbol, statesByHash)
      if (!next.index) {
        next.index = states.length
        states.push(next)
      }
      // console.log(' * ', symbol, '->', next.index)
    }

    // console.log()
  }
  return states
}

module.exports = {
  State,
  generateStates,
}

