
const { LR1 } = require('./grammar')


class Node {
  constructor(label) {
    this.label = label
    this.edges = []
    this.edgesById = {}
    // data?

    this.id = ++Node.highestId
  }

  get name() {
    return '?btwvuxyz'[this.id]
  }

  addEdge(node) {
    if (!(node.id in this.edgesById)) {
      let edge = new Edge(node)
      this.edges.push(edge)
      this.edgesById[node.id] = edge
      return edge
    }
    return this.edgesById[node.id]
  }

  // TODO: test
  // nb. length can be out-of-bounds (return [])
  // or zero (return [this])
  traverse(length) {
    let paths = [{ begin: this, path: [] }]

    // TODO use linked list of Edges here.

    for ( ; length--; ) {
      let newPaths = []
      for (var i = paths.length; i--; ) {
        let { begin, path } = paths[i]
        let edges = begin.edges
        for (var j = edges.length; j--; ) {
          let edge = edges[j]
          newPaths.push({ begin: edge.node, path: path.concat([edge]) })
        }
      }
      paths = newPaths
    }
    return paths
  }

  debug() {
    var r = ''
    r += '  ' + this.name + ' (s' + this.label.index + ') {\n'
    for (let link of this.edges) {
      r += '    => ' + link.name + '\n'
    }
    r += '  }'
    return r
  }
}
Node.highestId = 0


class Edge {
  constructor(node) {
    this.node = node

    this.derivations = []
  }

  /*
   * The RNGLR paper uses Rekers for better memory efficiency.
   * Use Tomita's SPPF algorithm since it's simpler & faster
   */
  addDerivation(rule, edges) {
    let children = []
    for (var i = edges.length; i--; ) {
      children.push(edges[i].derivations[0])
    }

    console.log('' + rule, children) //.map(edge => edge.derivations[0]))
    let data = rule.build.apply(null, children)

    this.derivations.push(data) //{ target: rule.target, children })
    if (this.derivations.length > 1) {
      throw 'wow'
    }

    console.log(this.debug())
  }

  debug() {
    return this.derivations[0]

    let d = this.derivations[0]
    if (!d) return '???'
    return '(' + d.target + ' ' + d.children.map(x => x.debug()) + ')'
  }
}


class Shift {
  constructor(start, advance) {
    this.start = start // Node
    this.advance = advance // State
  }
}


class Reduction {
  constructor(start, rule, length) {
    this.firstEdge = start // Edge
    this.rule = rule // Rule
    this.length = length // int
    this.hash = start.node.id + '$' + this.target + '$' + this.length
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
    let TOK = this.token.type
    if (TOK in state.transitions) {
      this.shifts.push({
        start: node,
        advance: state.transitions[TOK],
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
    let TOKEN = nextColumn.token // is .type
    let TOK = TOKEN.type
    let DATA = this.token

    for (var i = 0; i < this.shifts.length; i++) {
      let shift = this.shifts[i]
      let { start, advance } = shift // start: Node = v, advance: State = k

      let edge
      if (nextColumn.byState[advance.index]) {
        // existing node
        let node = nextColumn.byState[advance.index] // node: Node = w
        edge = node.addEdge(start)
        edge.derivations.push(DATA)

      } else {
        // new node
        let node = nextColumn.addNode(advance) // node: Node = w
        edge = node.addEdge(start)
        edge.derivations.push(DATA)

        // TODO comment
        for (let item of advance.reductions[TOK] || []) {
          if (item.dot === 0) {
            // TODO ???
            nextColumn.addReduction({ node: node, derivations: [null] }, item.rule, 0) // (w, B, 0)
          }
        }
      }

      // TODO comment
      for (let item of advance.reductions[TOK] || []) {
        if (item.dot !== 0) {
          nextColumn.addReduction(edge, item.rule, item.dot) // (v, B, t)
        }
      }
    }
    return nextColumn
  }

  reduce() {
    let TOKEN = this.token
    let TOK = TOKEN.type

    for (var i = 0; i < this.reductions.length; i++) {
      let reduction = this.reductions[i]
      delete this.uniqueReductions[reduction.hash]
      let { firstEdge, rule, length } = reduction // length: Int = m
      let target = rule.target // target = X
      let start = firstEdge.node // start: Node = w
      // console.log('(', start.name, target, length, ')')

      let set = start.traverse(Math.max(0, length - 1))

      let edge
      for (let p of set) {
        let { begin, path } = p // begin: Node = u

        // begin.label: State = k
        let nextState = begin.label.transitions[target] // nextState: State = l
        if (!nextState) continue

        let node
        if (nextState.index in this.byState) {
          // existing node
          node = this.byState[nextState.index] // node: Node = w
          edge = node.addEdge(begin) // create an edge from w to u

          edge.addDerivation(rule, path.concat([firstEdge]))

        } else {
          // new node
          node = this.addNode(nextState) // node: Node = w
          edge = node.addEdge(begin) // create an edge (w, u)

          edge.addDerivation(rule, path.concat([firstEdge]))

          /*
           * record all reductions (of length >0)
           * together with the second node along the path
           * which is `node`, since the `start` of a Reduction is the second node... ?!
           */
          for (let item of nextState.reductions[TOK] || []) { // lookup l
            if (item.dot === 0) {
              // item.rule.target = B
              // edge: node
              this.addReduction({ node: node, derivations: [null] }, item.rule, 0) // (w, B, 0)
            }
          }
        }

        /*
         * we're creating a new path
         * so we need to make sure we record valid reductions (of length >0)
         * to check those against the new path
         */
        if (length > 0) {
          for (let item of nextState.reductions[TOK] || []) { // lookup l
            if (item.dot > 0) {
              // item.rule.target = B
              // edge: begin
              this.addReduction(edge, item.rule, item.dot) // (u, B, t)
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
  // TODO don't hardcode grammar start symbol
  let acceptingState = startState.transitions['JSONText']

  // TODO handle empty input

  var TOKEN = lex()
  let startColumn = new Column(TOKEN)
  let startNode = startColumn.addNode(startState)
  for (let item of startState.reductions[TOKEN.type] || []) {
    let length = item.rule.symbols.length
    startColumn.addReduction(start, item.rule.target, length)
  }

  startColumn.reduce()
  // console.log(startColumn.debug())
  // console.log(startColumn.reductions)

  TOKEN = lex()
  var column = new Column(TOKEN)
  startColumn.shift(column)

  let count = 0
  while (TOKEN !== LR1.EOF) {
    count++

    // check column is non-empty
    // TODO: check shifts length instead.
    if (Object.keys(column.byState).length === 0) {
      debugger
      throw new Error('Syntax error')
    }

    column.reduce()
    console.log(column.debug())
    // console.log(column.reductions)

    TOKEN = lex()
    var nextColumn = new Column(TOKEN)
    column.shift(nextColumn)
    column = nextColumn
  }

  column.reduce()
  console.log(column.debug())

  let finalNode = column.byState[acceptingState.index]
  if (!finalNode) {
      throw new Error('Unexpected end of input')
  }

  let rootEdge = finalNode.edgesById[startNode.id]
  console.log(rootEdge.debug())

  console.log('success!')
  return column
}

module.exports = {
  parse,
}

