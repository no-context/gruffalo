
const fs = require('fs')
const path = require('path')
const Benchmark = require('benchmark');

const gilbert = require('../gilbert')
// const nearley = require('nearley')

function read(filename) {
  return fs.readFileSync(filename, 'utf-8')
}

function stringLexer(input) {
  var index = 0
  return function lex() {
    let c = input[index++]
    return { type: c || '$', value: c }
  }
}


// JSON parser

const { grammar, tokenizer } = require('./json')
let jp = gilbert.parserFor(grammar)
function jsonParser(input) {
  tokenizer.initString(input)
  return jp(tokenizer.getNextToken.bind(tokenizer))
}

// tosh parser

let toshGrammar = gilbert.Grammar.fromNearley(require('./tosh.js'))
let tp = gilbert.parserFor(toshGrammar)
function toshParser(input) {
  return tp(stringLexer(input))
}


// For making tests

function addTest(parserName, parser, examples) {
    examples.forEach(function(example) {
        var input = example.source;
        suite.add(parserName + ' ' + example.name, function() {
            parser(input);
        });
    })
}

function nearleyParser(neFile) {
    var grammar;
    try {
        grammar = compile(read(neFile));
    } catch (e) {
        grammar = null; // oh dear
    }

    function parse(input) {
        if (grammar === null) {
            throw 'grammar error';
        }
        var p = new Parser(grammar);
        p.feed(input);
        return p.results;
    }

    return parse;
}

function Example(name, source) {
    this.name = name;
    this.source = source;
}

Example.read = function(filename) {
  return new Example(path.basename(filename), read(filename));
};

// Define benchmarks

var suite = new Benchmark.Suite();

/*
addTest('nearley json', makeParser('examples/json.ne'), [
    // Example.read('test/test1.json'),
    Example.read('test/test2.json'),
    Example.read('test/sample1k.json'),
]);
*/

addTest('tosh', toshParser, [
    new Example('ex1', 'set foo to 2 * e^ of ( foo * -0.05 + 0.5) * (1 - e ^ of (foo * -0.05 + 0.5))'),
]);

addTest('gilbert json', jsonParser, [
    // Example.read('test/test1.json'),
    Example.read('test/test2.json'),
    Example.read('test/sample1k.json'),
    Example.read('test/sample10k.json'),
]);




/*
addTest('native JSON.parse', JSON.parse, [
   Example.read('test/test1.json'),
   Example.read('test/test2.json'),
])
*/

// TODO benchmark compile


// Run & report results

suite.on('cycle', function(event) {
    var bench = event.target;
    if (bench.error) {
        console.log('  ✘ ', bench.name);
        console.log(bench.error.stack);
        console.log('');
    } else {
        console.log('  ✔ ' + bench)
    }
})
.on('complete', function() {
    // TODO: report geometric mean.
})
.run();

