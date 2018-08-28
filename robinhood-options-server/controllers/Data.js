module.exports = (function () {
  const fs = require('fs');

  var basicStructure = [];

  const fixFloat = value => parseFloat(parseFloat(value).toFixed(2));

  this.getOptionSpreadsList = (req, res, next) => {
    res.send(200, fs.readdirSync('data').map(file => file.replace('.json', '')).reverse());
  };

  this.getOptionSpreads = (req, res, next) => {
    const files = fs.readdirSync('data');
    const file = `${req.query.date}.json`;
    if (files.indexOf(file) === -1) {
      return res.send(404);
    }
    const data = require(`./../data/${file}`);
    basicStructure = data.map(this.formBasicStructure);
    data.map(this.parseOptionSpreads);
    res.send(200, basicStructure);
  };

  this.formBasicStructure = instrument => {
    const expirationDates = Object.keys(instrument.option_chain.expirations);
    const expirations = _.mapObject(_.indexBy(expirationDates), () => {
      return {
        call: {
          credit: [],
          debit: [],
        },
        put: {
          credit: [],
          debit: [],
        },
      };
    });
    return {
      quote: {
        last_trade_price: instrument.quote.last_trade_price,
      },
      spreads: expirations,
      symbol: instrument.symbol,
    };
  };

  this.parseOptionSpreads = instrument => {
    const expirationDates = Object.keys(instrument.option_chain.expirations);
    expirationDates.forEach(expirationDate => {
      this.parseOptionSpread(instrument, true, true, expirationDate);
      this.parseOptionSpread(instrument, false, true, expirationDate);
    });
  };

  this.parseOptionSpread = (instrument, isCall, isDebit, expirationDate) => {
    const spreads = this.reduceSpreads(
      instrument.symbol,
      instrument.quote.last_trade_price,
      isCall,
      isDebit,
      instrument.option_chain.expirations[expirationDate][isCall ? 'calls' : 'puts']
    );
    basicStructure
      .find(quote => quote.symbol === instrument.symbol)
      .spreads[expirationDate][isCall ? 'call' : 'put'][isDebit ? 'debit' : 'credit'] = isCall ? spreads.reverse() : spreads;
  };

  this.reduceSpreads = (symbol, lastTradePrice, isCall, isDebit, options) => {
    return options.reduce((carry, option, index, array) => {
      if (index === array.length - 1) return carry;
      if (option.fundamentals.volume === 0 || array[index + 1].fundamentals.volume === 0) return carry;
      if (!option.quote.adjusted_mark_price || !array[index + 1].quote.adjusted_mark_price) return carry;
      const legs = `${fixFloat(option.strike_price)}/${fixFloat(array[index + 1].strike_price)}`;
      const spread = isCall
        ? fixFloat(array[index + 1].strike_price - option.strike_price)
        : fixFloat(option.strike_price - array[index + 1].strike_price);
      const cost = fixFloat(option.quote.adjusted_mark_price - array[index + 1].quote.adjusted_mark_price);
      const diff = fixFloat(spread - cost);
      if (cost <= 0 || cost === spread || diff <= 0) return carry;
      const percentage = fixFloat(fixFloat(fixFloat(diff * 100) / fixFloat(cost * 100)) * 100);
      carry.push({
        cost,
        description: `${legs} @ ${cost} | ${fixFloat(diff * 100)} / ${fixFloat(cost * 100)} = ${percentage}%`,
        itm: isCall ? array[index + 1].strike_price < lastTradePrice : array[index + 1].strike_price > lastTradePrice,
        itm_percentage: fixFloat(fixFloat(fixFloat(Math.abs(lastTradePrice - array[index + 1].strike_price)) / lastTradePrice) * 100),
        max_gain: diff,
        max_gain_percentage: percentage,
        name: `${symbol} ${legs} ${isCall ? 'Call' : 'Put'} ${isDebit ? 'Debit' : 'Credit'} Spread`,
      });
      return carry;
    }, []);
  };

  return this;
}.bind({}))();
