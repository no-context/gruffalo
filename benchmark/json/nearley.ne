@{%
var STRING = {literal: 'STRING'}
var NUMBER = {literal: 'NUMBER'}
var TRUE = {literal: 'TRUE'}
var FALSE = {literal: 'FALSE'}
var NULL = {literal: 'NULL'}
%}


json ->  (object | array)


object -> "{" (member ( "," member):*):? "}"


member -> %STRING ":" value


array -> "[" (value ("," value):*):? "]"


value ->
          %STRING
        | %NUMBER
        | object
        | array
        | %TRUE
        | %FALSE
        | %NULL

