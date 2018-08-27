module.exports = router => {
  const robinhood = require('./controllers/Robinhood');

  router.get('/', (req, res, next) => {
    return res.send('WELCOME TO THE ROBINHOOD OPTIONS REST API');
  });

  router.get('/option-chains', robinhood.getOptionChains);
};
