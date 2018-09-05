module.exports = router => {
  const robinhood = require('./controllers/Robinhood');

  router.get('/', (req, res, next) => {
    return res.send('WELCOME TO THE ROBINHOOD PORTFOLIO REST API');
  });

  router.get('/account-data', robinhood.getAccountData);
  router.get('/margin-stocks', robinhood.getMarginStocks);
  router.get('/options-portfolio', robinhood.getOptionsPortfolio);
  router.get('/stocks-portfolio', robinhood.getStocksPortfolio);
};
