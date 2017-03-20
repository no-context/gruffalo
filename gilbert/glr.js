
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
    // assert(firstEdge.head.node === this)
    let paths = [firstEdge]

    for ( ; length--; ) {
      let newPaths = []
      for (var i = paths.length; i--; ) {
        let path = paths[i]
        let begin = path ? path.head.node : this
        let edges = begin.edges
        for (var j = edges.length; j--; ) {
          let edge = edges[j]
          newPaths.push(new Path(edge, path))
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


class Path {
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


// TODO how to implement this efficiently ?
class RSet {
  constructor() {
    this.reductions = []
    this.unique = {}
  }

  add(start, item, firstEdge) {
    let hash = start.id + '$' + item.id
    if (!this.unique[hash]) {
      this.reductions.push(this.unique[hash] = {start, item, firstEdge})
    }
  }

  pop() {
    let r = this.reductions.pop()
    if (!r) return
    let hash = r.start.id + '$' + r.item.id
    delete this.unique[hash]
    return r
  }
}


var TOK
var GOTO
var DATA
var LENGTH

var REDUCTIONS = new RSet()
var NODES = {}
var TOKEN

function push(advance, start) {
  var node = NODES[advance.index]

  if (!node) {
    // new node
    var node = NODES[advance.index] = new Node(advance) // node: Node = w

    /*
     * record all reductions (of length 0)
     * together with the second node along the path
     * which is `node`, since the `start` of a Reduction is the second node... ?!
     */
    for (let item of advance.reductions[TOK] || []) { // lookup l
      if (item.dot === 0) {
        REDUCTIONS.add(node, item, null) // (w, B, 0)
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
        REDUCTIONS.add(start, item, new Path(edge)) // (v, B, t)
      }
    }
  }

  return edge
}

function goSwitch(start) {
  let advance = start.label.transitions[GOTO]
  if (advance) {
    return push(advance, start)
  }
}

function shift(nextColumn) {
  var OLD = NODES
  NODES = {}
  let keys = Object.keys(OLD)

  for (let index of keys) {
    let start = OLD[index] // start: Node = v, advance: State = k
    let edge = goSwitch(start)
    if (edge) {
      edge.data = DATA
    }
  }
  return nextColumn
}

function reduce(item, start, firstEdge) {
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
    let edge = goSwitch(begin)
    // assert(edge)
    edge.addDerivation(rule, path, firstEdge)
  }
}

function reduceAll() {
  var reduction
  while (reduction = REDUCTIONS.pop()) {
    let { start, item, firstEdge } = reduction // length: Int = m
    reduce(item, start, firstEdge)
  }
}



function parse(startState, target, lex) {
  // TODO don't hardcode grammar start symbol
  let acceptingState = startState.transitions[target]

  // TODO handle empty input

  TOKEN = lex()

  NODES = {}
  let startNode = NODES[startState.index] = new Node(startState)
  for (let item of startState.reductions[TOKEN.type] || []) {
    let length = item.rule.symbols.length
    REDUCTIONS.add(start, item, null)
  }

  var count = 0
  do {
    reduceAll()
    // console.log(column.debug())
    // console.log(column.reductions)

    GOTO = TOKEN.type
    DATA = TOKEN

    TOKEN = lex()
    TOK = TOKEN.type
    LENGTH = 1

    shift(NODES)

    // check column is non-empty
    if (Object.keys(NODES).length === 0) {
      throw new Error('Syntax error @ ' + count + ': ' + JSON.stringify(TOKEN.type))
    }
    count++
  } while (TOKEN.type !== LR1.EOF)

  reduceAll()
  // console.log(column.debug())

  let finalNode = NODES[acceptingState.index]
  if (!finalNode) {
      throw new Error('Unexpected end of input')
  }

  let rootEdge = finalNode.edgesById[startNode.id]

  return rootEdge.data
}

module.exports = {
  parse,
}

