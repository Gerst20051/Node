const _ = require('underscore');
const __ = require('lodash');
const dictionary = require('./dictionary');
const fs = require('fs');
const jsonfile = require('jsonfile');
const roundGrids = require('./round-grids');

const english = jsonfile.readFileSync('english.json');
const sowpods = fs.readFileSync(`${__dirname}/sowpods.txt`).toString().split('\n');
const trie = {};
const eow = '_';
const gridSolutions = [[], [], [], []];
var playGrids = {};
var pathTree = [{}, {}, {}, {}];

function log(key, value) {
  console.log(`${key} => ${JSON.stringify(value)}`);
}

init();

function init() {
  createTrie();
  generateGrid();
  generateGridSolutions();
}

function createTrie() {
  _.each(dictionary, function (word) {
    __.set(trie, `${word}${eow}`.split(''), true);
  });
}

function searchTrie(word) {
  return __.get(trie, `${word.toUpperCase()}${eow}`.split(''), false);
}

function existsInTrie(word) {
  return true;
}

function generateGrid() {
  playGrids = _.map(roundGrids, grid => {
    const count = _.reduce(_.flatten(grid), (carry, item) => { return item ? ++carry : carry; }, 0);
    const chars = _.map(_.times(count, () => _.sample('ABCDEFGHIJKLMNOPQRSTUVWXYZ0')), c => { return c === '0' ? 'QU' : c });
    return _.map(grid, row => {
      return _.map(row, item => {
        return item ? chars.shift() : undefined;
      });
    });
  });
}

function generateGridSolutions() {
  _.each(playGrids, (grid, gridIndex) => {
    console.log(grid);
    _.each(grid, (row, rowIndex) => {
      _.each(row, (item, itemIndex) => {
        if (item && gridIndex === 0) {
          const pathTreeKey = `${rowIndex},${itemIndex}`;
          pathTree[gridIndex][pathTreeKey] = {};
          spiderGridFromIndex(gridIndex, rowIndex, itemIndex, pathTreeKey, []);
        }
      });
    });
  });
}

function getNearGridOptions(grid, rowIndex, itemIndex) {
    const w = grid[rowIndex] && grid[rowIndex][itemIndex - 1] && [rowIndex, itemIndex - 1];
    const nw = grid[rowIndex - 1] && grid[rowIndex - 1][itemIndex - 1] && [rowIndex - 1 , itemIndex - 1];
    const n = grid[rowIndex - 1] && grid[rowIndex - 1][itemIndex] && [rowIndex - 1 , itemIndex];
    const ne = grid[rowIndex - 1] && grid[rowIndex - 1][itemIndex + 1] && [rowIndex - 1 , itemIndex + 1];
    const e = grid[rowIndex] && grid[rowIndex][itemIndex + 1] && [rowIndex , itemIndex + 1];
    const se = grid[rowIndex + 1] && grid[rowIndex + 1][itemIndex + 1] && [rowIndex + 1 , itemIndex + 1];
    const s = grid[rowIndex + 1] && grid[rowIndex + 1][itemIndex] && [rowIndex + 1 , itemIndex];
    const sw = grid[rowIndex + 1] && grid[rowIndex + 1][itemIndex - 1] && [rowIndex + 1 , itemIndex - 1];
    return [w, nw, n, ne, e, se, s, sw];
}

function setToValue(obj, value, path) {
  for (var i = 0; i < path.length - 1; i++) {
    obj = obj[path[i]];
  }
  obj[path[i]] = value;
}

function getWordFromPath(gridIndex, startingPathKey, path) {
  var word = '';
  for (var i = 0; i < path.length - 1; i++) {
    const coords = path[i].split(',');
    word += playGrids[gridIndex][coords[0]][coords[1]];
  }
  return word;
}

function filterNearGridOptions(gridIndex, gridOptions, path) {
  return _.filter(gridOptions, gridOption => {
    return gridOption && !_.contains(path, `${gridOption[0]},${gridOption[1]}`);
  });
}

function spiderGridFromIndex(gridIndex, rowIndex, itemIndex, startingPathKey, fullPath) {
  const grid = playGrids[gridIndex];
  const nearGridOptionsFiltered = filterNearGridOptions(gridIndex, getNearGridOptions(grid, rowIndex, itemIndex), fullPath);
  _.each(nearGridOptionsFiltered, (gridOption, gridOptionIndex) => {
    const pathTreeKey = `${gridOption[0]},${gridOption[1]}`;
    const currentFullPath = fullPath.concat([ pathTreeKey ]);
    const currentWord = getWordFromPath(gridIndex, startingPathKey, currentFullPath);
    if (searchTrie(currentWord) && !_.contains(gridSolutions[gridIndex], currentWord)) {
      console.log(currentWord);
      gridSolutions[gridIndex].push(currentWord);
    }
    if (existsInTrie(currentWord)) {
      spiderGridFromIndex(gridIndex, gridOption[0], gridOption[1], startingPathKey, currentFullPath);
    }
  });
}
