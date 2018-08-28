module.exports = router => {
  const data = require('./controllers/Data');
  const robinhood = require('./controllers/Robinhood');

  router.get('/', (req, res, next) => {
    return res.send('WELCOME TO THE ROBINHOOD OPTIONS REST API');
  });

  router.get('/option-chains', robinhood.getOptionChains);
  router.get('/option-spreads', data.getOptionSpreads);
  router.get('/option-spreads-list', data.getOptionSpreadsList);
};
