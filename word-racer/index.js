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
const gridSolutions = [];
var playGrids = {};
var pathTree = [[], [], [], []];

init();

function init() {
  // console.log(`SOWPODS Dictionary List Length => ${dictionary.length}`); // 267751
  // console.log(`English JSON List Length => ${english.length}`); // 6752
  // console.log(`SOWPODS TXT List Length => ${sowpods.length}`); // 267751
  createTrie();
  // console.log(searchTrie('WORDGAME'));
  generateGrid();
  // console.log(playGrids);
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

function generateGrid() {
  playGrids = _.map(roundGrids, grid => {
    const count = _.reduce(_.flatten(grid), (carry, item) => { return item ? ++carry : carry; }, 0);
    const chars = _.map(_.times(count, () => _.sample('ABCDEFGHIJKLMNOPQRSTUVWXYZ0')), c => { return c === '0' ? 'Qu' : c });
    return _.map(grid, row => {
      return _.map(row, item => {
        return item ? chars.shift() : undefined;
      });
    });
  });
}

function generateGridSolutions() {
  _.each(playGrids, (grid, gridIndex) => {
    _.each(grid, (row, rowIndex) => {
      _.each(row, (item, itemIndex) => {
        if (item && gridIndex === 0) {
          const pathTreeKey = `${rowIndex},${itemIndex}`;
          pathTree[gridIndex][pathTreeKey] = [];
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

function findElementFromFullPath(gridIndex, startingPathKey, fullPath) {
  var currentPath = pathTree[gridIndex][startingPathKey];
  _.each(fullPath, part => {
    if (_.contains(currentPath, part)) {
      currentPath = currentPath[part];
    }
  });
  return currentPath;
}

function filterNearGridOptions(gridIndex, gridOptions, element) {
  return _.filter(gridOptions, gridOption => {
    if (gridOption) {
      const pathTreeKey = `${gridOption[0]},${gridOption[1]}`;
      if (!_.contains(element, pathTreeKey)) {
        return gridOption;
      }
    }
  });
}

var calls = 0;

function spiderGridFromIndex(gridIndex, rowIndex, itemIndex, startingPathKey, fullPath) {
  console.log(fullPath);
  const grid = playGrids[gridIndex];
  // const term = searchTrie(grid[rowIndex][itemIndex]);
  const element = findElementFromFullPath(gridIndex, startingPathKey, fullPath);
  const nearGridOptionsFiltered = filterNearGridOptions(gridIndex, getNearGridOptions(grid, rowIndex, itemIndex), element);
  _.each(nearGridOptionsFiltered, (gridOption, gridOptionIndex) => {
    const pathTreeKey = `${gridOption[0]},${gridOption[1]}`;
    element.push({ [pathTreeKey]: [] });
    // if (++calls < 10000000) {
      spiderGridFromIndex(gridIndex, gridOption[0], gridOption[1], startingPathKey, fullPath.concat([ pathTreeKey ])); // RangeError: Maximum call stack size exceeded
    // }
  });
  // console.log(element);
}
