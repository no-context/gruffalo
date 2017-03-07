
const { LR1 } = require('./grammar')


class Node {
  constructor(label) {
    this.label = label
    this.edges = []
    this.edgesByState = {}
    // data?

    this.id = ++Node.highestId
  }

  addEdge(state) {
    if (!(state.index in this.edgesByState)) {
      this.edges.push(state)
      this.edgesByState[state.index] = true
      return true
    }
    return false
  }

  // TODO: test
  traverse(length) {
    let set = [this]

    for ( ; length--; ) {
      let newSet = []
      let byState = {}
      for (var i = newSet.length; i--; ) {
        var edges = newSet[i].edges
        for (var j = edges.length; j--; ) {
          let stateIndex = edges[j].label.index
          if (stateIndex in byState) {
            continue
          }
          newSet.push(byState[stateIndex] = edges[j])
        }
      }
      set = newSet
    }
    return set
  }

  debug() {
    var r = ''
    r += '  ' + this.id + ': s' + this.label.index + ' {\n'
    for (let link of this.edges) {
      r += '    => ' + link.id + ': s' + link.label.index + '\n'
    }
    r += '  }'
    return r
  }
}
Node.highestId = 0


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
  constructor(token) {
    this.shifts = []
    this.reductions = []
    this.uniqueReductions = {}
    this.byState = {} // State.index -> Node

    this.token = token
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
    return node
  }

  addReduction(start, target, length) {
    console.log('red')
    let reduction = new Reduction(start, target, length) // TODO opt
    if (reduction.hash in this.uniqueReductions) {
      return
    }
    this.reductions.push(this.uniqueReductions[reduction.hash] = reduction)
  }

  shift(nextToken) {
    let TOKEN = this.token
    let nextColumn = new Column(nextToken)

    for (var i = 0; i < this.shifts.length; i++) {
      let shift = this.shifts[i]
      let { start, advance } = shift // start = v, advance = k

      if (nextColumn.byState[advance.index]) {
        // existing node
        let node = nextColumn.byState[advance.index] // node = w
        node.addEdge(start)

        for (let item of advance.reductions[nextToken]) {
          let length = item.rule.symbols.length
          if (length !== 0) {
            nextColumn.addReduction(start, item.rule.target, length)
          }
        }

      } else {
        // new node
        let node = nextColumn.addNode(advance)
        node.addEdge(start)

        // TODO comment
        console.log(advance.reductions, nextToken)
        for (let item of advance.reductions[nextToken] || []) {
          let length = item.rule.symbols.length
          if (length === 0) {
            nextColumn.addReduction(node, item.rule.target, 0)
          }
        }
      }

      // TODO comment
      console.log(advance.reductions, nextToken)
      for (let item of advance.reductions[nextToken] || []) {
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

      let set = start.traverse(Math.max(0, length - 1))
      for (let begin of set) {
        let nextState = begin.label.transitions[target]
        if (!nextState) continue

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
  process(token) {
    let nextColumn = this.shift(token)
    while (nextColumn.reductions.length) {
      nextColumn.reduce()
    }
    return nextColumn
  }

  debug() {
    var r = ''
    r += 'col [\n'
    for (let stateIndex of Object.keys(this.byState)) {
      let node = this.byState[stateIndex]
      r += node.debug() + '\n'
    }
    r += ']'
    return r
  }
}


function parse(startState, lex) {
  let acceptingState = startState.transitions['$acc']

  // TODO handle empty input

  let startColumn = new Column(undefined)
  TOKEN = lex()
  startColumn.token = TOKEN.type
  startColumn.addNode(startState)
  for (let item of startState.reductions[TOKEN] || []) {
    let length = item.rule.symbols.length
    startColumn.addReduction(start, item.rule.target, length)
  }
  console.log(startColumn.debug())
  TOKEN = lex()
  var column = startColumn.process(TOKEN.type)

  let count = 0
  var prev
  while (TOKEN.type !== LR1.EOF) {
    count++

    console.log(column.debug())

    // check column is non-empty
    if (Object.keys(column.byState).length === 0) {
      debugger
      throw new Error('Syntax error')
    }

    prev = column
    // TODO don't advance here
    TOKEN = lex()
    column = column.process(TOKEN.type)
  }
  console.log(column.debug())
  console.log(column)

  let finalNode = column.byState[acceptingState]
  if (!finalNode) {
      throw new Error('Unexpected end of input')
  }
  return column
}

module.exports = {
  parse,
}

