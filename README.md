Gruffalo
========

Parser generator.

![The Gruffalo](.github/gruffalo.png)

Based on the RNGLR algorithm described in the paper [Right Nulled GLR Parsers](https://pdfs.semanticscholar.org/ae18/fa7080e85922fa916591bc73cd100ff5e861.pdf) (Elizabeth Scott & Adrian Johnstone, ACM, 2006).

RNGLR parsers accept any context-free grammar, while still being (nearly?) as fast as LR parsers (e.g. yacc).


See also
--------

* [Elkhound](http://scottmcpeak.com/elkhound/sources/elkhound/) (C++) is a "hybrid" GLR/LR parser, which uses the LR algorithm when the input & grammar are (locally) deterministic.
* [Bison](http://www.gnu.org/software/bison/manual/html_node/GLR-Parsers.html) now has a stack-splitting GLR mode (but I believe doesn't merge identical stacks, so can explode)
* [ANTLR4]() is pretty fast, and seems to have nice tooling (uses an "approximation" to LL(k)). But its support for ambiguous grammars is very young.
