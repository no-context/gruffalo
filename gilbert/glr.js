
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
  // nb. length can be out-of-bounds (return [])
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
    r += '  ' + '?btwvuxyz'[this.id] + ' (s' + this.label.index + ') {\n'
    for (let link of this.edges) {
      r += '    => ' + '?btwvuxyz'[link.id] + '\n'
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
    let reduction = new Reduction(start, target, length) // TODO opt
    if (reduction.hash in this.uniqueReductions) {
      return
    }
    this.reductions.push(this.uniqueReductions[reduction.hash] = reduction)
  }

  shift(nextColumn) {
    let TOK = nextColumn.token // is .type

    for (var i = 0; i < this.shifts.length; i++) {
      let shift = this.shifts[i]
      let { start, advance } = shift // start: Node = v, advance: State = k

      if (nextColumn.byState[advance.index]) {
        // existing node
        let node = nextColumn.byState[advance.index] // node: Node = w
        node.addEdge(start)

      } else {
        // new node
        let node = nextColumn.addNode(advance) // node: Node = w
        node.addEdge(start)

        // TODO comment
        for (let item of advance.reductions[TOK] || []) {
          if (item.dot === 0) {
            nextColumn.addReduction(node, item.rule.target, 0) // (w, B, 0)
          }
        }
      }

      // TODO comment
      for (let item of advance.reductions[TOK] || []) {
        if (item.dot !== 0) {
          nextColumn.addReduction(start, item.rule.target, item.dot) // (v, B, t)
        }
      }
    }
    return nextColumn
  }

  reduce() {
    let TOK = this.token

    for (var i = 0; i < this.reductions.length; i++) {
      let reduction = this.reductions[i]
      delete this.uniqueReductions[reduction.hash]
      let { start, target, length } = reduction // start: Node = w, target = X, length: Int = m
      console.log(TOK, '?btwvuxyz'[start.id], target, length)

      let set = start.traverse(Math.max(0, length - 1))

      console.log(set.map(n => '?btwvuxyz'[n.id]))
      console.log(start.traverse(1))

      for (let begin of set) { // begin: Node = u
        // begin.label: State = k
        let nextState = begin.label.transitions[target] // nextState: State = l
        if (!nextState) continue

        if (nextState.index in this.byState) {
          // existing node
          let node = this.byState[nextState.index] // node: Node = w
          node.addEdge(begin) // create an edge from w to u

        } else {
          // new node
          let node = this.addNode(nextState) // node: Node = w
          node.addEdge(begin) // create an edge (w, u)

          /*
           * record all reductions (of length >0)
           * together with the second node along the path
           * which is `node`, since the `start` of a Reduction is the second node... ?!
           */
          for (let item of nextState.reductions[TOK]) { // lookup l
            if (item.dot === 0) {
              // item.rule.target = B
              this.addReduction(node, item.rule.target, 0) // (w, B, 0)
            }
          }
        }

        /*
         * we're creating a new path
         * so we need to make sure we record valid reductions (of length >0)
         * to check those against the new path
         */
        if (length > 0) {
          for (let item of nextState.reductions[TOK]) { // lookup l
            if (item.dot > 0) {
              // item.rule.target = B
              this.addReduction(begin, item.rule.target, item.dot) // (u, B, t)
            }
          }
        }
      }
      // TODO
    }
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

  var TOKEN = lex()
  let startColumn = new Column(TOKEN.type)
  startColumn.addNode(startState)
  for (let item of startState.reductions[TOKEN.type] || []) {
    let length = item.rule.symbols.length
    startColumn.addReduction(start, item.rule.target, length)
  }

  startColumn.reduce()
  console.log(startColumn.debug())
  console.log(startColumn.reductions)

  TOKEN = lex()
  var column = new Column(TOKEN.type)
  startColumn.shift(column)

  let count = 0
  while (TOKEN.type !== LR1.EOF) {
    count++

    // check column is non-empty
    // TODO: check shifts length instead.
    if (Object.keys(column.byState).length === 0) {
      debugger
      throw new Error('Syntax error')
    }

    column.reduce()
    console.log(column.debug())
    console.log(column.reductions)

    TOKEN = lex()
    var nextColumn = new Column(TOKEN.type)
    column.shift(nextColumn)
    column = nextColumn
  }

  column.reduce()
  console.log(column.debug())

  let finalNode = column.byState[acceptingState]
  if (!finalNode) {
      throw new Error('Unexpected end of input')
  }
  return column
}

module.exports = {
  parse,
}

