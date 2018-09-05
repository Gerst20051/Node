module.exports = router => {
  const stocks = require('./controllers/Stocks');

  router.get('/', (req, res, next) => {
    return res.send('WELCOME TO THE STOCK MARKET DISCOVERY REST API');
  });

  router.get('/stockhistory/:ticker', stocks.getStockHistory);
  router.get('/stockhistory/:ticker/:interval', stocks.getStockHistory);
  router.get('/stockhistory/:ticker/:interval/:start_date', stocks.getStockHistory);
  router.get('/stockhistory/:ticker/:interval/:start_date/:end_date', stocks.getStockHistory);
  router.get('/stockquote/:ticker', stocks.getStockQuote);
  router.get('/stockquotes/:tickers', stocks.getStockQuotes);
  router.get('/dividends/:tickers', stocks.getDividends);
  router.get('/analyzedividends/:tickers', stocks.analyzeDividends);
};
