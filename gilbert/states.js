
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
    let items = this.items
    let predicted = {}
    for (var i = 0; i < items.length; i++) { // nb. expands during iteration
      let item = items[i]
      if (item.wants === undefined) {
        continue
      }

      //let lookahead = item.wantsLookahead(grammar)
      let after = item.rule.symbols.slice(item.dot + 1)
      let lookahead = grammar.firstTerminal(after.concat([item.lookahead]))

      var spawned = predicted[item.wants]
      if (!spawned) { spawned = predicted[item.wants] = {} }

      for (var key in lookahead) {
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


function generateStates(g) {
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

function logStates(states) {
  let start = states[0]

  states.forEach(state => {
    console.log('s' + state.index)

    for (let item of state.items) {
      let r = item.toString()
      while (r.length < 50) { r += ' ' }

      if (item.wants === undefined) {
        if (item.rule.isAccepting) {
          r += ' accept'
        } else {
          // reduction
          r += ' reduce <' + item.rule + '>'
        }
      } else {
        r += ' -> s' + state.transitions[item.wants].index
      }
      console.log(r)
    }
    console.log()
  })
}


module.exports = {
  State,
  logStates,
  generateStates,
}

