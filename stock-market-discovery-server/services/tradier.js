module.exports = (function () {
  const Promise = require('promise');
  const request = require('request');

  // curl -sX GET "https://sandbox.tradier.com/v1/markets/quotes?symbols=spy" -H "Accept: application/json" -H "Authorization: Bearer 90OozW48Cd9GFnRzHKQCPZxN4Z5G" | jq
  // curl -sX GET "https://api.tradier.com/beta/markets/fundamentals/dividends?symbols=spy" -H "Accept: application/json" -H "Authorization: Bearer JNVNmYpOpxPS5CGXBfzD1AwCVo6J" | jq

  function getOptions(apikey) {
    return {
      headers: {
        'Accept': 'application/json'
      },
      auth: {
        'bearer': [ 'JNVNmYpOpxPS5CGXBfzD1AwCVo6J', '90OozW48Cd9GFnRzHKQCPZxN4Z5G' ][apikey]
      }
    };
  }

  this.quotes = tickers => {
    const options = _.extend(getOptions(1), {
      url: 'https://sandbox.tradier.com/v1/markets/quotes?symbols=' + tickers.join(',')
    });
    return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        const json = JSON.parse(body);
        if (error || !json.quotes.quote) reject(error);
        else resolve(json.quotes.quote);
      });
    });
  };

  this.history = (ticker, interval, start_date, end_date, ex_date) => {
    if (!_.contains([ 'daily', 'weekly', 'monthly' ], interval)) {
      interval = 'daily';
    }
    var url = `https://sandbox.tradier.com/v1/markets/history?symbol=${ticker}&interval=${interval}`;
    if (start_date) {
      url += `&start=${start_date}`;
    }
    if (end_date) {
      url += `&end=${end_date}`;
    }
    const _options = _.extend(getOptions(1), { url: url });
    return new Promise((resolve, reject) => {
      request(_options, (error, response, body) => {
        const json = JSON.parse(body);
        if (error || !json.history.day) reject(error);
        else resolve({
          ticker: ticker,
          start_date: start_date,
          end_date: end_date,
          ex_date: ex_date,
          history: json.history.day
        });
      });
    });
  };

  this.dividends = tickers => {
    const _options = _.extend(getOptions(0), {
      url: 'https://api.tradier.com/beta/markets/fundamentals/dividends?symbols=' + tickers.join(','),
    });
    return new Promise((resolve, reject) => {
      request(_options, (error, response, body) => {
        const json = JSON.parse(body);
        if (error) reject(error);
        else resolve(_.map(json, function (result) {
          return {
            symbol: result.request,
            dividends: _.sortBy(result.results[0].tables.cash_dividends, 'ex_date')
          }
        }));
      });
    });
  };

  return this;
})();
