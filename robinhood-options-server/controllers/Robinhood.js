module.exports = (function () {
  const robinhood = require('./../services/robinhood');

  this.getOptionChains = (req, res, next) => {
    robinhood.authenticateThenGetOptionData().then(results => {
      res.send(200, 'dont_return_data' in req.query ? {} : results);
    }).catch(error => {
      res.send(500);
    });
  };

  return this;
}.bind({}))();
