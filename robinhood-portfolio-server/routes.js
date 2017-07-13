module.exports = router => {
  const robinhood = require('./controllers/Robinhood');

  router.get('/', (req, res, next) => {
    return res.send('WELCOME TO THE ROBINHOOD PORTFOLIO REST API');
  });

  router.get('/accountdata', robinhood.getAccountData);
};
