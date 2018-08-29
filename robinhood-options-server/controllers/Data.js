module.exports = (function () {
  const fs = require('fs');

  var basicStructure = [];

  const fixFloat = value => parseFloat(parseFloat(value).toFixed(2));
  const removeTrailingZeros = value => String(parseFloat(value));

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
      this.parseOptionSpread(instrument, true, false, expirationDate);
      this.parseOptionSpread(instrument, false, false, expirationDate);
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
      const longLeg = this.transformOptionLeg(isDebit ? option : array[index + 1]);
      const shortLeg = this.transformOptionLeg(isDebit ? array[index + 1] : option);
      if (longLeg.fundamentals.volume === 0 || shortLeg.fundamentals.volume === 0) return carry;
      if (!longLeg.quote.adjusted_mark_price || !shortLeg.quote.adjusted_mark_price) return carry;
      const legs = `${fixFloat(longLeg.strike_price)} / ${fixFloat(shortLeg.strike_price)}`;
      const spread = isCall
        ? fixFloat(shortLeg.strike_price - longLeg.strike_price)
        : fixFloat(longLeg.strike_price - shortLeg.strike_price);
      const costOrCredit = fixFloat(longLeg.quote.adjusted_mark_price - shortLeg.quote.adjusted_mark_price);
      const maxGain = isDebit ? fixFloat(spread - costOrCredit) : costOrCredit;
      if ((isDebit && (costOrCredit <= 0 || costOrCredit === spread || maxGain <= 0)) || (!isDebit && costOrCredit >= 0)) return carry;
      const maxGainPercentageCreditRisk = fixFloat(fixFloat(-spread * 100) - fixFloat(-maxGain * 100));
      const maxGainPercentageCredit = fixFloat(fixFloat(fixFloat(-maxGain * 100) / maxGainPercentageCreditRisk) * 100);
      const maxGainPercentage = isDebit
        ? fixFloat(fixFloat(fixFloat(maxGain * 100) / fixFloat(costOrCredit * 100)) * 100)
        : maxGainPercentageCredit;
      const maxGainPercentageDisplay = maxGainPercentageCreditRisk <= 0 ? 'Infinity' : `${maxGainPercentage}%`;
      const typeOfSpread = `${isCall ? 'Call' : 'Put'} ${isDebit ? 'Debit' : 'Credit'} Spread`;
      const description = isDebit
        ? `${symbol} ${legs} @ ${costOrCredit} | ${fixFloat(maxGain * 100)} / ${fixFloat(costOrCredit * 100)} = ${maxGainPercentage}%`
        : `${symbol} ${legs} @ ${costOrCredit} | ${fixFloat(-maxGain * 100)} / ${fixFloat(fixFloat(-spread * 100) - fixFloat(-maxGain * 100))} = ${maxGainPercentageDisplay}`;
      const itm = isDebit
        ? (isCall ? shortLeg.strike_price < lastTradePrice : shortLeg.strike_price > lastTradePrice)
        : (isCall ? shortLeg.strike_price > lastTradePrice : shortLeg.strike_price < lastTradePrice);
      const itm_percentage = fixFloat(fixFloat(fixFloat(Math.abs(lastTradePrice - shortLeg.strike_price)) / lastTradePrice) * 100);
      if (longLeg.quote.ask_size === 0 || shortLeg.quote.bid_size === 0) return carry;
      carry.push({
        cost: costOrCredit,
        description,
        itm,
        itm_percentage,
        legs: {
          description: legs,
          long: longLeg,
          short: shortLeg,
        },
        max_gain: maxGain,
        max_gain_percentage: isDebit ? maxGainPercentage : (maxGainPercentageCreditRisk <= 0 ? 'Infinity' : maxGainPercentage),
        name: `${symbol} ${legs} ${typeOfSpread}`,
        type: typeOfSpread,
      });
      return carry;
    }, []);
  };

  this.transformOptionLeg = option => {
    option = _.omit(option, ['id', 'instrument']);
    option.fundamentals = _.mapObject(option.fundamentals, value => {
      return typeof value === 'string' && value.includes('.') ? removeTrailingZeros(value) : value;
    });
    option.strike_price = removeTrailingZeros(option.strike_price);
    option.quote = _.mapObject(option.quote, value => {
      return typeof value === 'string' && value.includes('.') ? removeTrailingZeros(value) : value;
    });
    return option;
  };

  return this;
}.bind({}))();
