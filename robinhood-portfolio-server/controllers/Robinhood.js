module.exports = (function () {
  const robinhood = require('./../services/robinhood');

  this.getAccountData = (req, res, next) => {
    robinhood.account().then(results => {
      res.send(200, results);
    }).catch(error => {
      res.send(500);
    });
  };

  return this;
})();
