module.exports = (function () {
  const Promise = require('promise');
  const request = require('request');

  let token = '';
  let accountData, portfolioData;
  let stockPositionsData = [], optionPositionsData = [], instrumentsData = [], quotesData = [], fullInstrumentsData = [];
  const baseDomain = 'https://api.robinhood.com';

  const fixFloat = value => parseFloat(parseFloat(value).toFixed(2));
  const removeTrailingZeros = value => String(parseFloat(value));

  function getOptions() {
    let options = {
      headers: {
        'Accept': 'application/json',
      },
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
        password: globalConfig.creds.robinhood.password,
      },
      method: 'POST',
      url: `${baseDomain}/api-token-auth/`,
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
      .then(this.accountResponse);
  };

  this.marginStocks = () => {
    return Promise.resolve()
      .then(this.fullInstrumentsList)
      .then(this.marginStocksResponse);
  };

  this.optionsPortfolio = () => {
    return Promise.resolve()
      .then(this.authenticate).then(_token => { if (_token) token = _token; })
      .then(this.accounts).then(data => { accountData = data; })
      .then(this.portfolio).then(data => { portfolioData = data; })
      .then(_.partial(this.optionsAggregatePositions, true)).then(data => { optionPositionsData = data.filter(item => fixFloat(item.quantity) > 0); })
      .then(this.optionsPortfolioResponse);
  };

  this.stocksPortfolio = () => {
    return Promise.resolve()
      .then(this.authenticate).then(_token => { if (_token) token = _token; })
      .then(this.accounts).then(data => { accountData = data; })
      .then(this.portfolio).then(data => { portfolioData = data; })
      .then(_.partial(this.stockPositions, true)).then(data => { stockPositionsData = data; })
      .then(this.instruments).then(data => { instrumentsData = data; })
      .then(this.quotes).then(data => { quotesData = data; })
      .then(this.stocksPortfolioResponse);
  };

  this.accounts = () => {
    const options = _.extend(getOptions(), {
      url: `${baseDomain}/accounts/`,
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
      url: `${accountData.url}portfolio/`,
    });
    return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        const json = JSON.parse(body);
        if (error || !json) reject(error);
        else resolve(json);
      });
    });
  };

  this.optionsAggregatePositions = nonzero => {
    const query = nonzero ? '?nonzero=true' : '';
    const options = _.extend(getOptions(), {
      url: `${baseDomain}/options/aggregate_positions/${query}`,
    });
    return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        const json = JSON.parse(body);
        if (error || !json.results) reject(error);
        else resolve(json.results);
      });
    });
  };

  this.stockPositions = nonzero => {
    const query = nonzero ? '?nonzero=true' : '';
    const options = _.extend(getOptions(), {
      url: `${accountData.url}positions/${query}`,
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
    const instrumentIds = _.map(_.pluck(stockPositionsData, 'instrument'), instrument => _.last(_.compact(instrument.split('/'))));
    return Promise.all(_.map(instrumentIds, this.instrument));
  };

  this.instrument = instrumentId => {
    const options = _.extend(getOptions(), {
      url: `${baseDomain}/instruments/${instrumentId}`,
    });
    return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        const json = JSON.parse(body);
        if (error || !json) reject(error);
        else resolve(json);
      });
    });
  };

  this.instrumentCallback = (instrumentId, callback) => {
    const options = _.extend(getOptions(), {
      url: `${baseDomain}/instruments/${instrumentId}`,
    });
    request(options, (error, response, body) => {
      const json = JSON.parse(body);
      _.each(json.results, instrument => { fullInstrumentsData.push(instrument); });
      if (!error && json && json.next) {
        this.instrumentCallback(`?${json.next.split('?')[1]}`, callback);
      } else {
        callback();
      }
    });
  };

  this.fullInstrumentsList = () => {
    return new Promise((resolve, reject) => {
      if (!fullInstrumentsData.length) {
        this.instrumentCallback('', resolve);
      } else {
        resolve();
      }
    });
  };

  this.quotes = () => {
    const symbols = _.pluck(instrumentsData, 'symbol');
    const options = _.extend(getOptions(), {
      url: `${baseDomain}/quotes/?symbols=${symbols.join()}`,
    });
    return new Promise((resolve, reject) => {
      if (!symbols.length) {
        return resolve([]);
      }
      request(options, (error, response, body) => {
        const json = JSON.parse(body);
        if (error || !json.results) reject(error);
        else resolve(json.results);
      });
    });
  };

  this.accountResponse = () => {
    return {
      account: _.extend(_.pick(accountData.margin_balances, [
        'day_trade_buying_power',
        'overnight_buying_power',
        'start_of_day_overnight_buying_power',
        'unallocated_margin_cash',
      ]), _.pick(accountData, [
        'buying_power',
        'cash_held_for_orders',
        'sma',
      ])),
      portfolio: _.pick(portfolioData, [
        'equity',
        'extended_hours_equity',
        'extended_hours_market_value',
        'market_value',
      ]),
    };
  };

  this.marginStocksResponse = () => {
    return {
      margin_stocks: _.map(_.filter(fullInstrumentsData, instrument => instrument.margin_initial_ratio < 1), instrument => {
        return _.pick(instrument, [
          'day_trade_ratio',
          'maintenance_ratio',
          'margin_initial_ratio',
          'name',
          'symbol',
          'tradeable',
        ]);
      })
    };
  };

  this.optionsPortfolioResponse = () => {
    return {
      ...this.accountResponse(),
      ...{
        positions: _.map(optionPositionsData, positionData => {
          return positionData; // TODO: Transform Data
        }),
      },
    };
  };

  this.stocksPortfolioResponse = () => {
    return {
      ...this.accountResponse(),
      ...{
        positions: _.map(stockPositionsData, positionData => {
          const instrumentData = _.pick(_.find(instrumentsData, instrumentData => {
            return instrumentData.id === _.last(_.compact(positionData.instrument.split('/')));
          }), [
            'symbol',
            'name',
          ]);
          let position = _.extend(_.omit(positionData, [
            'account',
            'instrument',
            'url',
          ]), instrumentData);
          position.quote = _.omit(_.find(quotesData, quoteData => quoteData.symbol === position.symbol), [
            'instrument',
            'last_trade_price_source',
            'previous_close_date',
            'trading_halted',
            'updated_at',
          ]);
          return position;
        }),
      },
    };
  };

  return this;
})();
