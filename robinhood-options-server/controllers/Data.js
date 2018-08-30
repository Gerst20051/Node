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

  this.calculateMaxGain = (isDebit, spread, costOrCredit) => {
    const maxGain = isDebit ? fixFloat(spread - costOrCredit) : costOrCredit;
    const percentageCreditRisk = fixFloat(fixFloat(-spread * 100) - fixFloat(-maxGain * 100));
    const percentageCredit = fixFloat(fixFloat(fixFloat(-maxGain * 100) / percentageCreditRisk) * 100);
    const percentage = isDebit ? fixFloat(fixFloat(fixFloat(maxGain * 100) / fixFloat(costOrCredit * 100)) * 100) : percentageCredit;
    const percentageAsStringOrInfinity = percentageCreditRisk <= 0 ? 'Infinity' : `${percentage}%`;
    return {
      creditRisk: percentageCreditRisk,
      description: isDebit
        ? `${fixFloat(maxGain * 100)} / ${fixFloat(costOrCredit * 100)} = ${percentage}%`
        : `${fixFloat(-maxGain * 100)} / ${fixFloat(fixFloat(-spread * 100) - fixFloat(-maxGain * 100))} = ${percentageAsStringOrInfinity}`,
      percentage: percentage,
      percentageAsStringOrInfinity,
      percentageOrInfinity: isDebit ? percentage : (percentageCreditRisk <= 0 ? 'Infinity' : percentage),
      value: maxGain,
    };
  };

  this.reduceSpreads = (symbol, lastTradePrice, isCall, isDebit, options) => {
    return options.reduce((carry, option, index, array) => {
      if (index === array.length - 1) return carry;
      const longLeg = this.transformOptionLeg(isDebit ? option : array[index + 1]);
      const shortLeg = this.transformOptionLeg(isDebit ? array[index + 1] : option);
      if (longLeg.fundamentals.volume === 0 || shortLeg.fundamentals.volume === 0) return carry;
      if (!longLeg.quote.adjusted_mark_price || !shortLeg.quote.adjusted_mark_price) return carry;
      const legs = `${fixFloat(longLeg.strike_price)} / ${fixFloat(shortLeg.strike_price)}`;
      const spread = isCall ? fixFloat(shortLeg.strike_price - longLeg.strike_price) : fixFloat(longLeg.strike_price - shortLeg.strike_price);
      const markCostOrCredit = fixFloat(longLeg.quote.adjusted_mark_price - shortLeg.quote.adjusted_mark_price);
      const marketCostOrCredit = fixFloat(longLeg.quote.ask_price - shortLeg.quote.bid_price);
      const markPriceMaxGain = this.calculateMaxGain(isDebit, spread, markCostOrCredit);
      if ((isDebit && (markCostOrCredit <= 0 || markCostOrCredit === spread || markPriceMaxGain.value <= 0)) || (!isDebit && markCostOrCredit >= 0)) return carry;
      const marketPriceMaxGain = this.calculateMaxGain(isDebit, spread, marketCostOrCredit);
      if ((isDebit && (marketCostOrCredit <= 0 || marketPriceMaxGain === spread || marketPriceMaxGain.value <= 0)) || (!isDebit && marketCostOrCredit >= 0)) return carry;
      const typeOfSpread = `${isCall ? 'Call' : 'Put'} ${isDebit ? 'Debit' : 'Credit'} Spread`;
      if (longLeg.quote.ask_size === 0 || shortLeg.quote.bid_size === 0) return carry;
      const maxContractsAtMarket = Math.min(longLeg.quote.ask_size, shortLeg.quote.bid_size);
      var marketPriceMaxContractsDescription = `Can ${isDebit ? 'Buy' : 'Sell'} ${maxContractsAtMarket} ${maxContractsAtMarket > 1 ? 'Spreads' : 'Spread'}`;
      marketPriceMaxContractsDescription += ` For A $${Math.abs(fixFloat(marketCostOrCredit * maxContractsAtMarket * 100))} ${isDebit ? 'Debit' : 'Credit'}.`;
      const marketPriceMaxContractsDescription2 = isDebit
        ? `Could Have Max Gains Of $${fixFloat(marketPriceMaxGain.value * maxContractsAtMarket * 100)} At Expiration.`
        : `This Would Require $${Math.abs(fixFloat(spread * maxContractsAtMarket * 100))} Of Collateral.`;
      carry.push({
        itm: isDebit
          ? (isCall ? shortLeg.strike_price < lastTradePrice : shortLeg.strike_price > lastTradePrice)
          : (isCall ? shortLeg.strike_price > lastTradePrice : shortLeg.strike_price < lastTradePrice),
        itm_percentage: fixFloat(fixFloat(fixFloat(Math.abs(lastTradePrice - shortLeg.strike_price)) / lastTradePrice) * 100),
        legs: {
          description: legs,
          long: longLeg,
          short: shortLeg,
        },
        mark_price_details: {
          cost: markCostOrCredit,
          description: markPriceMaxGain.description,
          max_gain: markPriceMaxGain.value,
          max_gain_percentage: markPriceMaxGain.percentageOrInfinity,
        },
        market_price_details: {
          cost: marketCostOrCredit,
          description: marketPriceMaxGain.description,
          max_contracts_at_market: {
            cost: fixFloat(marketCostOrCredit * maxContractsAtMarket),
            description: marketPriceMaxContractsDescription,
            description2: marketPriceMaxContractsDescription2,
            number: maxContractsAtMarket,
            max_gain: fixFloat(marketPriceMaxGain.value * maxContractsAtMarket),
          },
          max_gain: marketPriceMaxGain.value,
          max_gain_percentage: marketPriceMaxGain.percentageOrInfinity,
        },
        name: `${symbol} ${legs} ${typeOfSpread}`,
        simple_description: `${symbol} ${legs} @ ${markCostOrCredit}`,
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
