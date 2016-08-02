const _ = require('underscore');
const __ = require('lodash');
const dictionary = require('./dictionary');
const fs = require('fs');
const jsonfile = require('jsonfile');

const english = jsonfile.readFileSync('english.json');
const sowpods = fs.readFileSync(`${__dirname}/sowpods.txt`).toString().split('\n');
const trie = {};
const eow = '_';

init();

function init() {
  console.log(`SOWPODS Dictionary List Length => ${dictionary.length}`); // 267751
  console.log(`English JSON List Length => ${english.length}`); // 6752
  console.log(`SOWPODS TXT List Length => ${sowpods.length}`); // 267751
  createTrie();
  console.log(searchTrie('WORDGAME'));
}

function createTrie() {
  _.each(dictionary, function (word) {
    __.set(trie, `${word}${eow}`.split(''), true);
  });
}

function searchTrie(word) {
  return __.get(trie, `${word.toUpperCase()}${eow}`.split(''), false);
}
