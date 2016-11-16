module.exports = (function () {
  const Promise = require('promise');
  const request = require('request');

  // curl -sX GET "https://sandbox.tradier.com/v1/markets/quotes?symbols=spy" -H "Accept: application/json" -H "Authorization: Bearer 90OozW48Cd9GFnRzHKQCPZxN4Z5G" | jq
  // curl -sX GET "https://sandbox.tradier.com/beta/markets/fundamentals/dividends?symbols=spy" -H "Accept: application/json" -H "Authorization: Bearer 90OozW48Cd9GFnRzHKQCPZxN4Z5G" | jq

  this.quotes = tickers => {
    const options = {
      url: 'https://sandbox.tradier.com/v1/markets/quotes?symbols=' + tickers.join(','),
      headers: {
        'Accept': 'application/json'
      },
      auth: {
        'bearer': '90OozW48Cd9GFnRzHKQCPZxN4Z5G'
      }
    };
    return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        const json = JSON.parse(body);
        if (error || !json.quotes.quote) reject(error);
        else resolve(json.quotes.quote);
      });
    });
  };

  this.history = (ticker, interval) => {
    if (!_.contains([ 'daily', 'weekly', 'monthly' ], interval)) {
      interval = 'daily';
    }
    const options = {
      url: `https://sandbox.tradier.com/v1/markets/history?symbol=${ticker}&interval=${interval}`,
      headers: {
        'Accept': 'application/json'
      },
      auth: {
        'bearer': '90OozW48Cd9GFnRzHKQCPZxN4Z5G'
      }
    };
    return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        const json = JSON.parse(body);
        if (error || !json.history.day) reject(error);
        else resolve(json.history.day);
      });
    });
  };

  return this;
})();
