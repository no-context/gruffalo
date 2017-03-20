
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
    return 'n' + this.id
    return '?btwvuxyzacdefghijklmnopqrs'[this.id]
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
  traverse(length, firstEdge) {
    // assert(firstEdge.node === this)
    let paths = [firstEdge ? new LList(firstEdge) : null]

    for ( ; length--; ) {
      let newPaths = []
      for (var i = paths.length; i--; ) {
        let path = paths[i]
        let begin = path ? path.head.node : this
        let edges = begin.edges
        for (var j = edges.length; j--; ) {
          let edge = edges[j]
          newPaths.push(new LList(edge, path))
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
      r += '    => ' + link.node.name + '\n'
    }
    r += '  }'
    return r
  }
}
Node.highestId = 0


class LList {
  constructor(head, tail) {
    this.head = head
    this.tail = tail
  }

  toArray() {
    let out = []
    let l = this
    do {
      out.push(l.head.data)
    } while (l = l.tail)
    return out
  }
}


class Edge {
  constructor(node) {
    this.node = node

    this.data = null
  }

  /*
   * The RNGLR paper uses Rekers for better memory efficiency.
   * Use Tomita's SPPF algorithm since it's simpler & faster
   */
  addDerivation(rule, path) {
    let children = path ? path.toArray() : []

    // console.log('' + rule, children)
    let data = rule.build.apply(null, children)

    if (this.data !== null) {
      throw 'wow'
    }
    this.data = data
  }

  debug() {
    return this.data
  }
}


class Reduction {
  constructor(start, item, firstEdge) {
    this.start = start // Node
    this.item = item
    this.firstEdge = firstEdge // Edge
    this.hash = start.id + '$' + item.id // TODO shouldn't firstEdge be included?
  }
}

var TOK
var GOTO
var DATA
var NEXT
var LENGTH

class Column {
  constructor(token) {
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
    return node
  }

  addReduction(start, item, firstEdge) {
    let reduction = new Reduction(start, item, firstEdge) // TODO opt
    if (reduction.hash in this.uniqueReductions) {
      return
    }
    this.reductions.push(this.uniqueReductions[reduction.hash] = reduction)
  }

  push(advance, start) {
    if (NEXT.byState[advance.index]) {
      // existing node
      var node = NEXT.byState[advance.index] // node: Node = w

    } else {
      // new node
      var node = NEXT.addNode(advance) // node: Node = w

      /*
       * record all reductions (of length 0)
       * together with the second node along the path
       * which is `node`, since the `start` of a Reduction is the second node... ?!
       */
      for (let item of advance.reductions[TOK] || []) { // lookup l
        if (item.dot === 0) {
          NEXT.addReduction(node, item) // (w, B, 0)
        }
      }
    }

    let edge = node.addEdge(start)

    /*
     * we're creating a new path
     * so we need to make sure we record valid reductions (of length >0)
     * to check those against the new path
     */
    if (LENGTH > 0) {
      for (let item of advance.reductions[TOK] || []) {
        if (item.dot !== 0) {
          NEXT.addReduction(start, item, edge) // (v, B, t)
        }
      }
    }

    return edge
  }

  goSwitch(start) {
    let advance = start.label.transitions[GOTO]
    if (advance) {
      return this.push(advance, start)
    }
  }

  shift(nextColumn) {
    GOTO = this.token.type

    let TOKEN = nextColumn.token // is .type
    TOK = TOKEN.type
    DATA = this.token
    NEXT = nextColumn
    LENGTH = 1

    let keys = Object.keys(this.byState)
    for (let index of keys) {
      let start = this.byState[index] // start: Node = v, advance: State = k
      let edge = this.goSwitch(start)
      if (edge) {
        edge.data = DATA
      }
    }
    return nextColumn
  }

  reduce(item, start, firstEdge) {
    let length = item.dot
    let rule = item.rule
    let target = rule.target // target = X
    // console.log('(', start.name, target, length, ')')
    let set = start.traverse(Math.max(0, length - 1), firstEdge)

    let edge
    for (let path of set) {
      let begin = path ? path.head.node : start

      // if (path) assert(begin === path.head.node)

      // begin.label: State = k

      LENGTH = length
      GOTO = target
      let edge = this.goSwitch(begin)
      // assert(edge)
      edge.addDerivation(rule, path, firstEdge)
    }
  }

  reduceAll() {
    let TOKEN = this.token
    let TOK = TOKEN.type
    NEXT = this

    for (var i = 0; i < this.reductions.length; i++) {
      let reduction = this.reductions[i]
      delete this.uniqueReductions[reduction.hash]
      let { start, item, firstEdge } = reduction // length: Int = m

      this.reduce(item, start, firstEdge)
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


function parse(startState, target, lex) {
  // TODO don't hardcode grammar start symbol
  let acceptingState = startState.transitions[target]

  // TODO handle empty input

  var TOKEN = lex()
  let startColumn = new Column(TOKEN)
  let startNode = startColumn.addNode(startState)
  for (let item of startState.reductions[TOKEN.type] || []) {
    let length = item.rule.symbols.length
    startColumn.addReduction(start, item)
  }
  var column = startColumn

  var count = 0
  do {
    column.reduceAll()
    // console.log(column.debug())
    // console.log(column.reductions)

    TOKEN = lex()
    var nextColumn = new Column(TOKEN)
    column.shift(nextColumn)
    column = nextColumn

    // check column is non-empty
    if (Object.keys(column.byState).length === 0) {
      throw new Error('Syntax error @ ' + count + ': ' + JSON.stringify(TOKEN.type))
    }
    count++
  } while (TOKEN.type !== LR1.EOF)

  column.reduceAll()
  // console.log(column.debug())

  let finalNode = column.byState[acceptingState.index]
  if (!finalNode) {
      throw new Error('Unexpected end of input')
  }

  let rootEdge = finalNode.edgesById[startNode.id]

  return rootEdge.data
}

module.exports = {
  parse,
}

