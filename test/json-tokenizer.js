(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory()
  } else {
    root.jsonTokenizer = factory()
  }
}(this, function() {

  const moo = require('moo')

  let lexer = moo.compile({
    space: {match: /\s+/, lineBreaks: true},
    NUMBER: /-?(?:[0-9]|[1-9][0-9]+)(?:\.[0-9]+)?(?:[eE][-+]?[0-9]+)?\b/,
    STRING: /"(?:\\["bfnrt\/\\]|\\u[a-fA-F0-9]{4}|[^"\\])*"/,
    '{': '{',
    '}': '}',
    '[': '[',
    ']': ']',
    ',': ',',
    ':': ':',
    TRUE: /true\b/,
    FALSE: /false\b/,
    NULL: /null\b/,
  })

  // skip whitespace
  let next = lexer.next.bind(lexer)
  lexer.next = function() {
    do {
      var tok = next()
    } while (tok && tok.type === 'space')
    if (!tok) {
      return { type: '$' }
    }
    return tok
  }

  return lexer;

}))

