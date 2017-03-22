// Generated automatically by nearley
// http://github.com/Hardmath123/nearley
(function () {
function id(x) {return x[0]; }

var STRING = {literal: 'STRING'}
var NUMBER = {literal: 'NUMBER'}
var TRUE = {literal: 'TRUE'}
var FALSE = {literal: 'FALSE'}
var NULL = {literal: 'NULL'}
var grammar = {
    ParserRules: [
    {"name": "json$subexpression$1", "symbols": ["object"]},
    {"name": "json$subexpression$1", "symbols": ["array"]},
    {"name": "json", "symbols": ["json$subexpression$1"]},
    {"name": "object$ebnf$1$subexpression$1$ebnf$1", "symbols": []},
    {"name": "object$ebnf$1$subexpression$1$ebnf$1$subexpression$1", "symbols": [{"literal":","}, "member"]},
    {"name": "object$ebnf$1$subexpression$1$ebnf$1", "symbols": ["object$ebnf$1$subexpression$1$ebnf$1", "object$ebnf$1$subexpression$1$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "object$ebnf$1$subexpression$1", "symbols": ["member", "object$ebnf$1$subexpression$1$ebnf$1"]},
    {"name": "object$ebnf$1", "symbols": ["object$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "object$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "object", "symbols": [{"literal":"{"}, "object$ebnf$1", {"literal":"}"}]},
    {"name": "member", "symbols": [STRING, {"literal":":"}, "value"]},
    {"name": "array$ebnf$1$subexpression$1$ebnf$1", "symbols": []},
    {"name": "array$ebnf$1$subexpression$1$ebnf$1$subexpression$1", "symbols": [{"literal":","}, "value"]},
    {"name": "array$ebnf$1$subexpression$1$ebnf$1", "symbols": ["array$ebnf$1$subexpression$1$ebnf$1", "array$ebnf$1$subexpression$1$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "array$ebnf$1$subexpression$1", "symbols": ["value", "array$ebnf$1$subexpression$1$ebnf$1"]},
    {"name": "array$ebnf$1", "symbols": ["array$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "array$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "array", "symbols": [{"literal":"["}, "array$ebnf$1", {"literal":"]"}]},
    {"name": "value", "symbols": [STRING]},
    {"name": "value", "symbols": [NUMBER]},
    {"name": "value", "symbols": ["object"]},
    {"name": "value", "symbols": ["array"]},
    {"name": "value", "symbols": [TRUE]},
    {"name": "value", "symbols": [FALSE]},
    {"name": "value", "symbols": [NULL]}
]
  , ParserStart: "json"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
