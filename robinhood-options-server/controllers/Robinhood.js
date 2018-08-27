module.exports = (function () {
  const robinhood = require('./../services/robinhood');

  this.getOptionChains = (req, res, next) => {
    robinhood.authenticateThenGetOptionData().then(results => {
      res.send(200, results);
    }).catch(error => {
      res.send(500);
    });
  };

  return this;
}.bind({}))();
