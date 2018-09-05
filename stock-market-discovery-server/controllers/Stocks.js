module.exports = (function () {
  const tradier = require('./../services/tradier');

  this.getStockHistory = (req, res, next) => {
    const ticker = req.params.ticker;
    const interval = req.params.interval || 'daily';
    tradier.history(ticker, interval, req.params.start_date, req.params.end_date).then(results => {
      res.send(200, results.history);
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

  this.getDividends = (req, res, next) => {
    tradier.dividends(req.params.tickers.split(',')).then(results => {
      res.send(200, results);
    }).catch(error => {
      res.send(500);
    });
  };

  this.analyzeDividends = (req, res, next) => {
    tradier.dividends(req.params.tickers.split(',')).then(results => {
      this.analyzeDividend(res, results);
    }).catch(error => {
      res.send(500);
    });
  };

  this.analyzeDividend = (res, data) => {
    var moment = require('moment');
    var promises = [];
    _.each(data, function (stock) {
      _.each(stock.dividends, function (dividend) {
        const ex_date = moment(dividend.ex_date, 'YYYY-MM-DD');
        promises.push(tradier.history(
          stock.symbol,
          'daily',
          ex_date.subtract(15, 'days').format('YYYY-MM-DD'),
          ex_date.add(30, 'days').format('YYYY-MM-DD'),
          ex_date.subtract(15, 'days').format('YYYY-MM-DD')
        ));
      });
    });
    Promise.all(promises).then(results => {
      var analysis = [];
      _.each(results, function (result) {
        var output = {};
        output.symbol = result.ticker;
        output.ex_date = result.ex_date;
        output.analysis = {};
        var pre_history = _.filter(result.history, function (history) {
          return moment(history.date).isBefore(result.ex_date);
        });
        var post_history = _.filter(result.history, function (history) {
          return moment(history.date).isAfter(result.ex_date);
        });
        output.analysis.pre_max = _.max(_.pluck(pre_history, 'high'));
        output.analysis.pre_min = _.min(_.pluck(pre_history, 'low'));
        output.analysis.post_max = _.max(_.pluck(post_history, 'high'));
        output.analysis.post_min = _.min(_.pluck(post_history, 'low'));
        output.profitable = output.analysis.pre_min < output.analysis.post_max;
        analysis.push(output);
      });
      var grouped = _.groupBy(analysis, 'symbol');
      analysis = _.mapObject(grouped, function (value, key) {
        return {
          probability: _.filter(value, function (result) {
            return result.profitable;
          }).length / value.length
        };
      });
      res.send(200, analysis);
    }).catch(error => {
      res.send(500);
    });
  };

  return this;
})();
