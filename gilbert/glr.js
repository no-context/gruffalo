


class Node {
  constructor(label) {
    this.label = label
    this.edges = []
    this.edgesByState = {}
    // data?
  }

  addEdge(state) {
    if (state.index in this.edgesByState) {
      this.edges.push(state)
      this.edgesByState[state.index] = true
      return true
    }
    return false
  }

  // TODO: test
  traverse(length) {
    if (length === 0) { throw 'oops' }

    let set = []
    var edges = this.edges
    for (var i = 0; i < edges.length; i++) {
      let node = edges[i]
      set.push({ begin: node, first: node })
    }

    for ( ; length--; ) {
      let newSet = []
      // let byState = {}
      for (var i = newSet.length; i--; ) {
        var edges = begin.edges
        let { begin, first } = newSet[i]
        for (var j = edges.length; j--; ) {
          let stateIndex = edges[j].label.index
          if (stateIndex in byState) {
            continue
          }
          // newSet.push(byState[stateIndex] = edges[j])
          newSet.push({ begin: edges[j], first: first })
        }
      }
      set = newSet
    }
    return set
  }
}


class Shift {
  constructor(start, advance) {
    this.start = start // Node
    this.advance = advance // State
  }
}


class Reduction {
  constructor(start, target, length) {
    this.start = start // Node
    this.target = target // str
    this.length = length // int
    this.hash = start + '$' + this.target + '$' + this.length
  }
}


class Column {
  constructor() {
    this.shifts = []
    this.reductions = []
    this.uniqueReductions = {}
    this.byState = {} // State.index -> Node

    this.token = null
  }

  addNode(state) {
    if (state.index in this.byState) {
      return this.byState[state.index]
    }
    let node = new Node(state)
    this.byState[state.index] = node

    /* if new node can shift next token, add to shift queue */
    if (this.token in state.transitions) {
      this.shifts.push({
        start: node,
        advance: state.transitions[this.token],
      })
    }
  }

  addReduction(start, target, length) {
    let reduction = new Reduction(start, target, length) // TODO opt
    if (reduction.hash in this.uniqueReductions) {
      return
    }
    this.reductions.push(this.uniqueReductions[reduction.hash] = reduction)
  }

  shift() {
    let TOKEN = this.token
    let nextColumn = new Column()

    for (var i = 0; i < this.shifts.length; i++) {
      let shift = this.shifts[i]
      let { start, advance } = shift // start = v, advance = k 

      if (nextColumn.byState[advance.index]) {
        // existing node
        let node = nextColumn.byState[advance.index] // node = w
        node.addEdge(start)

        for (let item of advance.reductions[TOKEN]) {
          let length = item.rule.symbols.length
          if (length !== 0) {
            this.addReduction(start, item.rule.target, length)
          }
        }

      } else {
        // new node
        let node = nextColumn.addNode(advance)
        node.addEdge(start)

        // TODO comment
        for (let item of advance.reductions[TOKEN]) {
          let length = item.rule.symbols.length
          if (length === 0) {
            this.addReduction(node, item.rule.target, 0)
          }
        }
      }

      // TODO comment
      for (let item of advance.reductions[TOKEN]) {
        let length = item.rule.symbols.length
        if (length !== 0) {
          this.addReduction(start, item.rule.target, length)
        }
      }
    }
    return nextColumn
  }
  
  reduce() {
    let TOKEN = this.token

    for (var i = 0; i < this.reductions.length; i++) {
      let reduction = this.reductions[i]
      delete this.uniqueReductions[reduction.hash]
      let { start, target, length } = reduction

      let set = Math.max(0, length - 1)
      for (let path of set) {
        let { begin, first } = path
        let nextState = begin.label.transitions[target]

        if (nextState.index in this.byState) {
          // existing node
          let node = this.byState[nextState.index]
          node.addEdge(begin)

        } else {
          // new node
          let node = this.addNode(nextState)
          node.addEdge(begin)

          /* 
           * record all reductions (of length >0)
           * together with the second node along the path
           * which is `node`, since the `start` of a Reduction is the second node... ?!
           */
          for (let item of state.reductions[TOKEN]) {
            if (item.rule.symbols.length === 0) {
            this.addReduction(node, item.rule.target, 0)
            }
          }
        }

        /* 
         * we're creating a new path
         * so we need to make sure we record valid reductions (of length >0)
         * to check those against the new path
         */
        if (length > 0) {
          for (let item of state.reductions[TOKEN]) {
            this.addReduction(begin, item.rule.target, item.rule.symbols.length)
          }
        }
      }
      // TODO
    }
  }

  /*
   *
   * shift()        -- a_i+1
   * then reduce()  -- a_i+1
   */
  process() {
    let nextColumn = this.shift()
    while (nextColumn.reductions.length) {
      nextColumn.reduce()
    }
    return nextColumn
  }
}


function parse(startState, lex) {
  let acceptingState = startState.transitions['$acc']

  // TODO handle empty input

  let startColumn = new Column(undefined)
  startColumn.token = TOKEN = lex()
  startColumn.addNode(startState)
  for (let item of startState.reductions[TOKEN]) {
    let length = item.rule.symbols.length
    startColumn.addReduction(start, item.rule.target, length)
  }
  var column = startColumn.process()

  while (TOKEN !== '$') {
    // check column is non-empty
    if (Object.keys(column.byState).length === 0) {
      throw new Error('Syntax error')
    }

    column.token = TOKEN = lex()
    column = column.process()
  } 

  let finalNode = column.byState[acceptingState]
  if (!finalNode) {
      throw new Error('Unexpected end of input')
  }
  return column
}

module.exports = {
  parse,
}

