module.exports = (function () {
  const Promise = require('promise');
  const request = require('request');

  var token = '';
  var accountData, portfolioData;
  var positionsData = [], instrumentsData = [], quotesData = [];
  const baseDomain = 'https://api.robinhood.com';

  function getOptions() {
    var options = {
      headers: {
        'Accept': 'application/json'
      }
    };
    if (token) {
      options.headers['Authorization'] = `Token ${token}`;
    }
    return options;
  }

  this.authenticate = () => {
    const options = _.extend(getOptions(), {
      form: {
        username: globalConfig.creds.robinhood.username,
        password: globalConfig.creds.robinhood.password
      },
      method: 'POST',
      url: `${baseDomain}/api-token-auth/`
    });
    return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        const json = JSON.parse(body);
        if (error) reject(error);
        else resolve(json.token);
      });
    });
  };

  this.account = () => {
    return Promise.resolve()
      .then(this.authenticate).then(_token => { if (_token) token = _token; })
      .then(this.accounts).then(data => { accountData = data; })
      .then(this.portfolio).then(data => { portfolioData = data; })
      .then(_.partial(this.positions, true)).then(data => { positionsData = data; })
      .then(this.instruments).then(data => { instrumentsData = data; })
      .then(this.quotes).then(data => { quotesData = data; })
      .then(this.response);
  };

  this.accounts = () => {
    const options = _.extend(getOptions(), {
      url: `${baseDomain}/accounts/`
    });
    return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        const json = JSON.parse(body);
        if (error || !json.results.length) reject(error);
        else resolve(_.first(json.results));
      });
    });
  };

  this.portfolio = () => {
    const options = _.extend(getOptions(), {
      url: `${accountData.url}/portfolio/`
    });
    return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        const json = JSON.parse(body);
        if (error || !json) reject(error);
        else resolve(json);
      });
    });
  };

  this.positions = (nonzero) => {
    const query = nonzero ? '?nonzero=true' : '';
    const options = _.extend(getOptions(), {
      url: `${accountData.url}/positions/${query}`
    });
    return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        const json = JSON.parse(body);
        if (error || !json.results) reject(error);
        else resolve(json.results);
      });
    });
  };

  this.instruments = () => {
    const instrumentIds = _.map(_.pluck(positionsData, 'instrument'), instrument => { return _.last(_.compact(instrument.split('/'))); });
    return Promise.all(_.map(instrumentIds, this.instrument));
  };

  this.instrument = (instrumentId) => {
    const options = _.extend(getOptions(), {
      url: `${baseDomain}/instruments/${instrumentId}`
    });
    return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        const json = JSON.parse(body);
        if (error || !json) reject(error);
        else resolve(json);
      });
    });
  };

  this.quotes = () => {
    const symbols = _.pluck(instrumentsData, 'symbol');
    const options = _.extend(getOptions(), {
      url: `${baseDomain}/quotes/?symbols=${symbols.join()}`
    });
    return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        const json = JSON.parse(body);
        if (error || !json.results) reject(error);
        else resolve(json.results);
      });
    });
  };

  this.response = () => {
    return {
      account: _.extend(_.pick(accountData.margin_balances, [
        'day_trade_buying_power',
        'overnight_buying_power',
        'start_of_day_overnight_buying_power',
        'unallocated_margin_cash'
      ]), _.pick(accountData, [
        'buying_power',
        'cash_held_for_orders',
        'sma'
      ])),
      portfolio: _.pick(portfolioData, [
        'equity',
        'extended_hours_equity',
        'extended_hours_market_value',
        'market_value'
      ]),
      positions: _.map(positionsData, positionData => {
        const instrumentData = _.pick(_.find(instrumentsData, instrumentData => {
          return instrumentData.id === _.last(_.compact(positionData.instrument.split('/')));
        }), [
          'symbol',
          'name'
        ]);
        var position = _.extend(_.omit(positionData, [
          'account',
          'instrument',
          'url'
        ]), instrumentData);
        position.quote = _.omit(_.find(quotesData, quoteData => { return quoteData.symbol === position.symbol; }), [
          'instrument',
          'last_trade_price_source',
          'previous_close_date',
          'trading_halted',
          'updated_at'
        ]);
        return position;
      })
    };
  };

  return this;
})();
