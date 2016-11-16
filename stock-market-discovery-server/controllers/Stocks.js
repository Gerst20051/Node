module.exports = (function () {
  const tradier = require('./../services/tradier');

  this.getStockHistory = (req, res, next) => {
    const ticker = req.params.ticker;
    const interval = req.params.interval || 'daily';
    tradier.history(ticker, interval).then(results => {
      res.send(200, results);
    }).catch(error => {
      res.send(500);
    });
  };

  this.getStockQuote = (req, res, next) => {
    const ticker = req.params.ticker;
    tradier.quotes([ ticker ]).then(results => {
      res.send(200, results);
    }).catch(error => {
      res.send(500);
    });
  };

  this.getStockQuotes = (req, res, next) => {
    const tickers = req.params.tickers;
    tradier.quotes(tickers.split(',')).then(results => {
      res.send(200, results);
    }).catch(error => {
      res.send(500);
    });
  };

  return this;
})();
