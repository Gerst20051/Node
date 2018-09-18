module.exports = (function () {
  const fs = require('fs');
  const request = require('request');
  const querystring = require('querystring');

  var date = null,
    token = '',
    bearerToken = '',
    quotesData = [],
    instrumentsData = [],
    fundamentalsData = [],
    optionExpirationData = [],
    basicStructure = [],
    optionChainsData = [],
    optionMarketData = [];

  const baseDomain = 'https://api.robinhood.com';
  const defaultSymbols = [
    'AAPL',
    'AMZN',
    'BABA',
    'BIDU',
    'DIA',
    'FB',
    'GOOGL',
    'IWM',
    'NFLX',
    'NVDA',
    'QQQ',
    'SPY',
    'TSLA',
    'UVXY',
  ];
  const bonusSymbols = [];
  const symbols = defaultSymbols.concat(bonusSymbols).sort();

  function getOptions() {
    const options = {
      headers: {
        Accept: 'application/json',
      },
    };
    if (bearerToken) {
      options.headers.Authorization = `Bearer ${bearerToken}`;
    }
    return options;
  }

  this.getAuthBearerToken = () => {
    const options = _.extend(getOptions(), {
      form: {
        client_id: globalConfig.creds.robinhood.client_id,
        expires_in: 86400,
        grant_type: 'password',
        password: globalConfig.creds.robinhood.password,
        scope: 'internal',
        username: globalConfig.creds.robinhood.username,
      },
      method: 'POST',
      url: `${baseDomain}/oauth2/token/`,
    });
    return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        const json = JSON.parse(body);
        if (error) reject(error);
        else resolve(json.access_token);
      });
    });
  };

  this.authenticateThenGetOptionData = loadFullChain => {
    date = new Date();
    return Promise.resolve()
      .then(this.getAuthBearerToken).then(_bearerToken => { if (_bearerToken) bearerToken = _bearerToken; })
      .then(this.quotes).then(data => { quotesData = _.map(data, this.transformQuote); })
      .then(this.instruments).then(data => { instrumentsData = _.map(data, this.transformInstrument); })
      .then(this.fundamentals).then(data => { fundamentalsData = _.map(data, this.transformFundamentals); })
      .then(this.optionExpirationDates).then(data => { optionExpirationData = _.map(data.filter(item => symbols.includes(item.symbol)), this.transformOptionExpirationDates); })
      .then(this.formBasicStructure).then(data => { basicStructure = data; })
      .then(_.partial(this.optionChains, loadFullChain)).then(data => { optionChainsData = this.transformOptionChains(data); })
      .then(this.getOptionsMarketData).then(data => { optionMarketData = data.map(arr => _.flatten(arr)); })
      .then(this.addMarketDataToOptionChains)
      .then(this.addOptionChainsToBasicStructure)
      .then(this.saveToFile)
      .then(this.response);
  };

  this.quotes = () => {
    const options = _.extend(getOptions(), {
      url: `${baseDomain}/quotes/?symbols=${symbols.join(',')}`,
    });
    return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        const json = JSON.parse(body);
        if (error || !json.results.length) reject(error);
        else resolve(json.results);
      });
    });
  };

  this.transformQuote = quote => {
    return _.pick(quote, [
      'ask_price',
      'ask_size',
      'bid_price',
      'bid_size',
      'instrument',
      'last_extended_hours_trade_price',
      'last_trade_price',
      'previous_close',
      'previous_close_date',
      'symbol',
    ]);
  };

  this.instruments = () => {
    return Promise.all(quotesData.map(quote => this.instrument(quote.instrument)));
  };

  this.instrument = url => {
    const options = _.extend(getOptions(), { url });
    return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        const json = JSON.parse(body);
        if (error) reject(error);
        else resolve(json);
      });
    });
  };

  this.transformInstrument = instrument => {
    return _.pick(instrument, [
      'fundamentals',
      'id',
      'name',
      'simple_name',
      'symbol',
      'tradable_chain_id',
    ]);
  };

  this.fundamentals = () => {
    return Promise.all(instrumentsData.map(instrument => this.fundamental(instrument.fundamentals)));
  };

  this.fundamental = url => {
    const options = _.extend(getOptions(), { url });
    return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        const json = JSON.parse(body);
        if (error) reject(error);
        else resolve(json);
      });
    });
  };

  this.transformFundamentals = instrument => {
    return _.pick(instrument, [
      'average_volume',
      'average_volume_2_weeks',
      'high',
      'high_52_weeks',
      'instrument',
      'low',
      'low_52_weeks',
      'open',
      'volume',
    ]);
  };

  this.optionExpirationDates = () => {
    const instrumentIds = _.pluck(instrumentsData, 'id');
    const options = _.extend(getOptions(), {
      url: `${baseDomain}/options/chains/?equity_instrument_ids=${instrumentIds.join(',')}`,
    });
    // TODO: Figure Out How To Make This API Return Weekly Expo Date On Thursday Night And Friday.
    return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        const json = JSON.parse(body);
        if (error || !json.results.length) reject(error);
        else resolve(json.results);
      });
    });
  };

  this.getDateString = date => {
    const monthCorrected = date.getMonth() + 1;
    const month = monthCorrected < 10 ? '0' + monthCorrected : monthCorrected;
    const day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();
    return `${date.getFullYear()}-${month}-${day}`;
  };

  this.transformOptionExpirationDates = optionExpirationDates => {
    const data = _.pick(optionExpirationDates, [
      'expiration_dates',
      'symbol',
    ]);
    const shouldAddWeeklyExpoDate = date.getDay() === 5 || (date.getDay() === 4 && date.getHours() >= 16);
    if (!shouldAddWeeklyExpoDate) return data;
    var weeklyExpoDate = this.getDateString(date);
    if (date.getDay() === 4) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      weeklyExpoDate = this.getDateString(tomorrow);
    }
    if (!data.expiration_dates.includes(weeklyExpoDate)) {
      data.expiration_dates = [ weeklyExpoDate ].concat(data.expiration_dates);
    }
    return data;
  };

  this.formBasicStructure = () => {
    var quotes = quotesData.map(quote => {
      return {
        instrument: quote.instrument,
        quote: _.pick(quote, [
          'ask_price',
          'ask_size',
          'bid_price',
          'bid_size',
          'last_extended_hours_trade_price',
          'last_trade_price',
          'previous_close',
          'previous_close_date',
        ]),
        symbol: quote.symbol,
      };
    });
    quotes = quotes.map(quote => {
      const instrument = instrumentsData.find(instrument => instrument.symbol === quote.symbol);
      return {
        id: instrument.id,
        instrument: quote.instrument,
        name: instrument.simple_name ? `${instrument.simple_name} (${instrument.name})` : instrument.name,
        option_chain: {
          id: instrument.tradable_chain_id,
        },
        quote: quote.quote,
        symbol: quote.symbol,
      };
    }).filter(quote => quote.option_chain.id !== null);
    quotes = quotes.map(quote => {
      const fundamentals = fundamentalsData.find(fundamentals => fundamentals.instrument === quote.instrument);
      return {
        fundamentals: _.pick(fundamentals, [
          'average_volume',
          'average_volume_2_weeks',
          'high',
          'high_52_weeks',
          'low',
          'low_52_weeks',
          'open',
          'volume',
        ]),
        id: quote.id,
        instrument: quote.instrument,
        name: quote.name,
        option_chain: quote.option_chain,
        quote: quote.quote,
        symbol: quote.symbol,
      };
    });
    quotes = quotes.map(quote => {
      const expirationDates = optionExpirationData.find(optionExpiration => optionExpiration.symbol === quote.symbol);
      if (!expirationDates) return null;
      return {
        fundamentals: quote.fundamentals,
        id: quote.id,
        instrument: quote.instrument,
        name: quote.name,
        option_chain: {
          id: quote.option_chain.id,
          expirations: _.mapObject(_.indexBy(expirationDates.expiration_dates), () => {
            return {
              calls: [],
              puts: [],
            };
          }),
        },
        quote: quote.quote,
        symbol: quote.symbol,
      };
    }).filter(quote => quote !== null);
    return quotes;
  };

  this.optionChains = loadFullChain => {
    return Promise.all(basicStructure.map(quote =>
      this.optionChain(quote.option_chain.id, Object.keys(quote.option_chain.expirations).slice(0, loadFullChain ? 20 : 6))
    ));
  };

  this.optionChain = (chainId, expirationDates) => {
    const params = {
      chain_id: chainId,
      expiration_dates: expirationDates.join(','),
      state: 'active',
    };
    const options = _.extend(getOptions(), {
      url: `${baseDomain}/options/instruments/?${querystring.stringify(params)}`,
    });
    return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        const json = JSON.parse(body);
        if (error || !json.results.length) reject(error);
        else resolve(json);
      });
    }).then(data => data.next ? this.optionChainNext(data.results, data.next) : data.results);
  };

  this.optionChainNext = (carry, url) => {
    const options = _.extend(getOptions(), { url });
    return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        const json = JSON.parse(body);
        if (error || !json.results.length) reject(error);
        else resolve(json);
      });
    }).then(data => data.next ? this.optionChainNext(carry.concat(data.results), data.next) : carry.concat(data.results));
  };

  this.transformOptionChains = optionChainsData => {
    return optionChainsData.map(optionChain => {
      return optionChain.map(option => {
        return {
          chain_symbol: option.chain_symbol,
          expiration_date: option.expiration_date,
          fundamentals: {},
          id: option.id,
          instrument: option.url,
          strike_price: option.strike_price,
          type: option.type,
          quote: {},
        };
      });
    });
  };

  this.getOptionsMarketData = () => {
    var promises = [];
    optionChainsData.forEach(optionChain => {
      const instrumentIds = _.chunk(_.pluck(optionChain, 'instrument'), 50);
      var subPromises = [];
      instrumentIds.forEach(instrumentIdsChunk => {
        subPromises.push(this.getOptionMarketData(instrumentIdsChunk));
      });
      promises.push(Promise.all(subPromises));
    });
    return Promise.all(promises);
  };

  this.getOptionMarketData = instrumentIds => {
    const options = _.extend(getOptions(), {
      url: `${baseDomain}/marketdata/options/?instruments=${instrumentIds.join(',')}`,
    });
    return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        try {
          const json = JSON.parse(body);
          if (error || !json.results.length) resolve([]);
          else resolve(json.results);
        } catch (e) {
          resolve([]);
        }
      });
    });
  };

  this.getMarketDataForOption = instrument => {
    return (optionMarketData.find(optionMarket => {
      return optionMarket.find(option => option && option.instrument === instrument);
    }) || []).find(option => option && option.instrument === instrument);
  };

  this.addMarketDataToOptionChains = () => {
    optionChainsData.forEach(optionChain => {
      optionChain.forEach(option => {
        const marketData = this.getMarketDataForOption(option.instrument);
        option.fundamentals = _.pick(marketData, [
          'chance_of_profit_long',
          'chance_of_profit_short',
          'delta',
          'gamma',
          'high_price',
          'implied_volatility',
          'low_price',
          'open_interest',
          'rho',
          'theta',
          'vega',
          'volume',
        ]);
        option.quote = _.pick(marketData, [
          'adjusted_mark_price',
          'ask_price',
          'ask_size',
          'bid_price',
          'bid_size',
          'break_even_price',
          'last_trade_price',
          'last_trade_size',
          'previous_close_date',
          'previous_close_price',
        ]);
      });
    });
  };

  this.getOptionChainBySymbol = symbol => {
    return optionChainsData.find(optionChain => optionChain.some(option => option.chain_symbol === symbol));
  };

  this.addOptionChainsToBasicStructure = () => {
    basicStructure.forEach(instrument => {
      const optionChainForSymbol = this.getOptionChainBySymbol(instrument.symbol);
      const optionChainGroupedByExpiration = _.groupBy(optionChainForSymbol, 'expiration_date');
      const expirations = Object.keys(instrument.option_chain.expirations);
      expirations.forEach(expiration => {
        const optionType = _.groupBy(optionChainGroupedByExpiration[expiration], 'type');
        if (optionType.call) {
          instrument.option_chain.expirations[expiration].calls = _.sortBy(optionType.call.map(option => _.omit(option, [ 'chain_symbol', 'expiration_date', 'type' ])), option => parseFloat(option.strike_price));
        }
        if (optionType.put) {
          instrument.option_chain.expirations[expiration].puts = _.sortBy(optionType.put.map(option => _.omit(option, [ 'chain_symbol', 'expiration_date', 'type' ])), option => parseFloat(option.strike_price)).reverse();
        }
      });
    });
  };

  this.saveToFile = () => {
    return new Promise((resolve, reject) => {
      const monthCorrected = date.getMonth() + 1;
      const month = monthCorrected < 10 ? '0' + monthCorrected : monthCorrected;
      const day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();
      const hours = date.getHours() < 10 ? '0' + date.getHours() : date.getHours();
      const minutes = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
      const fileName = `${date.getFullYear()}-${month}-${day} ${hours}:${minutes}`;
      fs.writeFile(`data/${fileName}.json`, JSON.stringify(basicStructure, null, 2), error => {
        if (error) reject(error);
        else resolve();
      });
    });
  };

  this.response = () => basicStructure;

  return this;
}.bind({}))();
