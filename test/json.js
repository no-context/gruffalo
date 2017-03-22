(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../gruffalo'))
  } else {
    root.jsonGrammar = factory(root.gruffalo)
  }
}(this, function(gruffalo) {

const {
  Grammar,
  Rule,
  compile,
} = gruffalo
/*****************************************************************************/


function id(x) {
  return x
}
function string(x) {
  return JSON.parse(x.value)
}
function number(x) {
  return +x.value
}

let g = new Grammar({ start: 'JSONText' })
function r(target, symbols, build) {
  g.add(new Rule(target, symbols, build))
}

r("JSONText", ["JSONValue"], id)

r("JSONString", ["STRING"], string)

r("JSONNullLiteral", ["NULL"], () => null)

r("JSONNumber", ["NUMBER"], number)

r("JSONBooleanLiteral", ["TRUE"], () => true)
r("JSONBooleanLiteral", ["FALSE"], () => false)

r("JSONValue", ["JSONNullLiteral"], id)
r("JSONValue", ["JSONBooleanLiteral"], id)
r("JSONValue", ["JSONString"], id)
r("JSONValue", ["JSONNumber"], id)
r("JSONValue", ["JSONObject"], id)
r("JSONValue", ["JSONArray"], id)

r("JSONObject", ["{", "}"], () => ({}))
r("JSONObject", ["{", "JSONMemberList", "}"], (_, dict, _2) => dict)

r("JSONMember", ["JSONString", ":", "JSONValue"], (key, _, value) => ({ key, value }))
r("JSONMemberList", ["JSONMember"], item => ({ [item.key]: item.value }))
r("JSONMemberList", ["JSONMemberList", ",", "JSONMember"], (dict, _, item) => {
  dict[item.key] = item.value
  return dict
})

r("JSONArray", ["[", "]"], () => [])
r("JSONArray", ["[", "JSONElementList", "]"], (_, a, _2) => a)

r("JSONElementList", ["JSONValue"], value => [value])
r("JSONElementList", ["JSONElementList", ",", "JSONValue"], (array, _, value) => {
  array.push(value)
  return array
})

return {
  grammar: g,
  tokenizer: require('./json-tokenizer'),
};

}))
