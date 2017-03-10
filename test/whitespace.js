// Generated automatically by nearley
// http://github.com/Hardmath123/nearley
(function () {
function id(x) {return x[0]; }
var grammar = {
    ParserRules: [
    {"name": "_$ebnf$1", "symbols": [], "postprocess": d => d},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", "wschar"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": function(d) {return null;}},
    {"name": "__$ebnf$1", "symbols": ["wschar"], "postprocess": d => d},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", "wschar"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "__", "symbols": ["__$ebnf$1"], "postprocess": function(d) {return null;}},
    {"name": "wschar", "symbols": [{"literal":" "}], "postprocess": d => d.value},
    {"name": "d", "symbols": ["a"], "postprocess": d => d},
    {"name": "a", "symbols": ["b", "_", {"literal":"&"}], "postprocess": d => d},
    {"name": "a", "symbols": ["b"], "postprocess": d => d},
    {"name": "b", "symbols": ["letter"], "postprocess": d => d},
    {"name": "b", "symbols": [{"literal":"("}, "_", "d", "_", {"literal":")"}], "postprocess": d => d},
    {"name": "letter", "symbols": [{"literal":'x'}], "postprocess": d => d}
]
  , ParserStart: "d"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
