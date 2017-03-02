
const fs = require('fs')

const gilbert = require('../gilbert')

function read(filename) {
  return fs.readFileSync(filename, 'utf-8')
}


describe('compiler', () => {

  test('can parse JSON', () => {
    let { grammar, tokenizer } = require('./json')
    let p = eval(gilbert.compile(grammar))
    function parse(input) {
      tokenizer.initString(input)
      return p(tokenizer.getNextToken.bind(tokenizer))
    }
    function check(input) {
      expect(parse(input)).toEqual(JSON.parse(input))
    }

    check(read('test/test1.json'))
    check(read('test/test2.json'))
    check(read('test/sample1k.json')) // too big for expect() to handle!
  })


})
