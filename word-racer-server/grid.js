module.exports = (() => {
  const dictionary = require('./dictionary');
  const frequencies = require('./frequencies');
  const roundGrids = require('./round-grids');

  const trie = {};
  const eow = '_';
  const gridSolutions = {};
  const playGrids = {};
  const wordsFound = {};
  var letters = '';

  init();

  function init() {
    createTrie();
    generateLetterDistribution();
  }

  function createTrie() {
    _.each(dictionary, word => {
      __.set(trie, `${word}${eow}`.split(''), true);
    });
  }

  function searchTrie(word) {
    return __.get(trie, `${word.toUpperCase()}${eow}`.split(''), false);
  }

  function existsInTrie(word) {
    return __.has(trie, word.toUpperCase().split('').join('.'));
  }

  function getTrie() {
    return trie;
  }

  function generateLetterDistribution() {
    const minFrequency = __.min(_.values(frequencies));
    const multiplier = __.round(102 / minFrequency);
    const letterCounts = __.mapValues(frequencies, (freq, letter) => { return __.round(freq * multiplier); });
    letters = _.reduce(letterCounts, (string, count, letter) => { return string += __.repeat(letter, count); }, '');
  }

  function generateGrids() {
    return _.map(roundGrids, grid => {
      const count = _.reduce(_.flatten(grid), (carry, item) => { return item ? ++carry : carry; }, 0);
      const chars = _.map(_.times(count, () => _.sample(letters)), c => { return c === '0' ? 'Qu' : c });
      return _.map(grid, row => {
        return _.map(row, item => {
          return item ? chars.shift() : undefined;
        });
      });
    });
  }

  function generateGridSolutions(gameId, grids) {
    playGrids[gameId] = grids;
    gridSolutions[gameId] = Array(grids.length).fill(null).map(() => { return []; });
    const pathTree = Array(grids.length).fill(null).map(() => { return {}; });
    _.each(grids, (grid, gridIndex) => {
      _.each(grids[gridIndex], (row, rowIndex) => {
        _.each(row, (item, itemIndex) => {
          if (item) {
            const pathTreeKey = `${rowIndex},${itemIndex}`;
            pathTree[gridIndex][pathTreeKey] = {};
            spiderGridFromIndex(gameId, gridIndex, rowIndex, itemIndex, pathTreeKey, []);
          }
        });
      });
    });
  }

  function getNearGridOptions(grid, rowIndex, itemIndex) {
    const w = grid[rowIndex] && grid[rowIndex][itemIndex - 1] && [ rowIndex, itemIndex - 1 ];
    const nw = grid[rowIndex - 1] && grid[rowIndex - 1][itemIndex - 1] && [ rowIndex - 1, itemIndex - 1 ];
    const n = grid[rowIndex - 1] && grid[rowIndex - 1][itemIndex] && [ rowIndex - 1, itemIndex ];
    const ne = grid[rowIndex - 1] && grid[rowIndex - 1][itemIndex + 1] && [ rowIndex - 1, itemIndex + 1 ];
    const e = grid[rowIndex] && grid[rowIndex][itemIndex + 1] && [ rowIndex, itemIndex + 1 ];
    const se = grid[rowIndex + 1] && grid[rowIndex + 1][itemIndex + 1] && [ rowIndex + 1, itemIndex + 1 ];
    const s = grid[rowIndex + 1] && grid[rowIndex + 1][itemIndex] && [ rowIndex + 1, itemIndex ];
    const sw = grid[rowIndex + 1] && grid[rowIndex + 1][itemIndex - 1] && [ rowIndex + 1, itemIndex - 1 ];
    return [ w, nw, n, ne, e, se, s, sw ];
  }

  function getWordFromPath(gameId, gridIndex, path) {
    var word = '';
    for (var i = 0; i < path.length; i++) {
      const coords = path[i].split(',');
      word += playGrids[gameId][gridIndex][coords[0]][coords[1]];
    }
    return word;
  }

  function filterNearGridOptions(gridIndex, gridOptions, path) {
    return _.filter(gridOptions, gridOption => {
      return gridOption && !_.contains(path, `${gridOption[0]},${gridOption[1]}`);
    });
  }

  function spiderGridFromIndex(gameId, gridIndex, rowIndex, itemIndex, startingPathKey, fullPath) {
    const grid = playGrids[gameId][gridIndex];
    const nearGridOptionsFiltered = filterNearGridOptions(gridIndex, getNearGridOptions(grid, rowIndex, itemIndex), fullPath);
    _.each(nearGridOptionsFiltered, (gridOption, gridOptionIndex) => {
      const pathTreeKey = `${gridOption[0]},${gridOption[1]}`;
      const currentFullPath = fullPath.concat([ pathTreeKey ]);
      const currentWord = getWordFromPath(gameId, gridIndex, currentFullPath).toUpperCase();
      if (searchTrie(currentWord) && !_.contains(gridSolutions[gameId][gridIndex], currentWord)) {
        gridSolutions[gameId][gridIndex].push(currentWord);
      }
      if (existsInTrie(currentWord)) {
        spiderGridFromIndex(gameId, gridIndex, gridOption[0], gridOption[1], startingPathKey, currentFullPath);
      }
    });
  }

  return {
    getTrie: getTrie,
    searchTrie: searchTrie,
    existsInTrie: existsInTrie,
    generateGrids: generateGrids,
    generateGridSolutions: generateGridSolutions
  };
})();
