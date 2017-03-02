
const {
  Grammar,
  Rule,
  compile,
} = require('./gilbert')


var bnf = {
        "JSONText": [ "JSONValue" ],

        "JSONString": [ "STRING" ],

        "JSONNullLiteral": [ "NULL" ],

        "JSONNumber": [ "NUMBER" ],

        "JSONBooleanLiteral": [ "TRUE", "FALSE" ],

        "JSONValue": [ "JSONNullLiteral",
                       "JSONBooleanLiteral",
                       "JSONString",
                       "JSONNumber",
                       "JSONObject",
                       "JSONArray" ],

        "JSONObject": [ "{ }",
                        "{ JSONMemberList }" ],

        "JSONMember": [ "JSONString : JSONValue" ],

        "JSONMemberList": [ "JSONMember",
                              "JSONMemberList , JSONMember" ],

        "JSONArray": [ "[ ]",
                       "[ JSONElementList ]" ],

        "JSONElementList": [ "JSONValue",
                             "JSONElementList , JSONValue" ]
}

let g = new Grammar({ start: 'JSONText' })
for (var target in bnf) {
  for (var line of bnf[target]) {
    var symbols = line.split(/ /g)
    g.add(new Rule(target, symbols))
  }
}
// g.log()
// console.log()

var source = compile(g)
//console.log(source)

var f = eval(source)

let { tokenizer } = require('./json.tokenizer')

const fs = require('fs')
var input = fs.readFileSync('../nearley/test/test2.json', 'utf-8')
tokenizer.initString(input)

console.log(pretty(f(tokenizer.getNextToken.bind(tokenizer))))

function pretty(s) {
  if (s && s instanceof Array) {
    return '[ ' + s.map(pretty).join(' ') + ' ]'
  }
  return '' + s
}

