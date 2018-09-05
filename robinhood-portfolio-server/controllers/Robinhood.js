module.exports = (function () {
  const robinhood = require('./../services/robinhood');

  this.getAccountData = (req, res, next) => {
    robinhood.account().then(results => {
      res.send(200, results);
    }).catch(error => {
      res.send(500);
    });
  };

  this.getMarginStocks = (req, res, next) => {
    robinhood.marginStocks().then(results => {
      res.send(200, results);
    }).catch(error => {
      res.send(500);
    });
  };

  this.getOptionsPortfolio = (req, res, next) => {
    robinhood.optionsPortfolio().then(results => {
      res.send(200, results);
    }).catch(error => {
      res.send(500);
    });
  };

  this.getStocksPortfolio = (req, res, next) => {
    robinhood.stocksPortfolio().then(results => {
      res.send(200, results);
    }).catch(error => {
      res.send(500);
    });
  };

  return this;
})();
