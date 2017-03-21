var chevrotain = require("chevrotain");

// ----------------- lexer -----------------
var createToken = chevrotain.createToken;
var Lexer = chevrotain.Lexer;
var Parser = chevrotain.Parser;

// In ES6, custom inheritance implementation (such as 'extendToken(...)') can be replaced with simple "class X extends Y"...
var True = createToken({name: "True", pattern: /true/});
var False = createToken({name: "False", pattern: /false/});
var Null = createToken({name: "Null", pattern: /null/});
var LCurly = createToken({name: "LCurly", pattern: /{/});
var RCurly = createToken({name: "RCurly", pattern: /}/});
var LSquare = createToken({name: "LSquare", pattern: /\[/});
var RSquare = createToken({name: "RSquare", pattern: /]/});
var Comma = createToken({name: "Comma", pattern: /,/});
var Colon = createToken({name: "Colon", pattern: /:/});
var StringLiteral = createToken({name: "StringLiteral", pattern: /"(?:[^\\"]|\\(?:[bfnrtv"\\/]|u[0-9a-fA-F]{4}))*"/});
var NumberLiteral = createToken({name: "NumberLiteral", pattern: /-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/});
var WhiteSpace = createToken({name: "WhiteSpace", pattern: /\s+/, group: Lexer.SKIPPED});

var allTokens = [WhiteSpace, NumberLiteral, StringLiteral, LCurly, RCurly, LSquare, RSquare, Comma, Colon, True, False, Null];
var JsonLexer = new Lexer(allTokens);


// ----------------- parser -----------------

function JsonParserES5(input) {
    // invoke super constructor
    Parser.call(this, input, allTokens, {
            // by default the error recovery / fault tolerance capabilities are disabled
            // use this flag to enable them
            recoveryEnabled: true
        }
    );

    // not mandatory, using <$> (or any other sign) to reduce verbosity (this. this. this. this. .......)
    var $ = this;

    this.RULE("json", function() {
        $.OR([
            {ALT: function() { $.SUBRULE($.object) }},
            {ALT: function() { $.SUBRULE($.array) }}
        ]);
    });

    this.RULE("object", function() {
        $.CONSUME(LCurly);
        $.OPTION(function() {
            $.SUBRULE($.objectItem);
            $.MANY(function() {
                $.CONSUME(Comma);
                $.SUBRULE2($.objectItem);
            });
        });
        $.CONSUME(RCurly);
    });

    this.RULE("objectItem", function() {
        $.CONSUME(StringLiteral);
        $.CONSUME(Colon);
        $.SUBRULE($.value);
    });

    this.RULE("array", function() {
        $.CONSUME(LSquare);
        $.OPTION(function() {
            $.SUBRULE($.value);
            $.MANY(function() {
                $.CONSUME(Comma);
                $.SUBRULE2($.value);
            });
        });
        $.CONSUME(RSquare);
    });

    this.RULE("value", function() {
        $.OR([
            {ALT: function() { $.CONSUME(StringLiteral) }},
            {ALT: function() { $.CONSUME(NumberLiteral) }},
            {ALT: function() { $.SUBRULE($.object) }},
            {ALT: function() { $.SUBRULE($.array) }},
            {ALT: function() { $.CONSUME(True) }},
            {ALT: function() { $.CONSUME(False) }},
            {ALT: function() { $.CONSUME(Null) }}
        ]);
    });

    // very important to call this after all the rules have been defined.
    // otherwise the parser may not work correctly as it will lack information
    // derived during the self analysis phase.
    Parser.performSelfAnalysis(this);
}

JsonParserES5.prototype = Object.create(Parser.prototype);
JsonParserES5.prototype.constructor = JsonParserES5;

module.exports = {
  JsonLexer,
  jsonParser: new JsonParserES5([]),
}
