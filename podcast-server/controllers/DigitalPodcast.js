module.exports = (function () {
  const service = require('./../services/digitalpodcast');
  const transformer = require('./../transformers/digitalpodcast');
  const request = require('request');

  this.search = (req, res, next) => {
    service.apiSearch(req.params.keywords).then(results => {
      res.send(200, transformer.transformSearchResults(results));
    }).catch(error => {
      res.send(500);
    });
  };

  this.feed = (req, res, next) => {
    service.apiFeed(req.params.url).then(results => {
      res.send(200, transformer.transformFeed(results));
    }).catch(error => {
      console.log(error);
      res.send(500);
    });
  };

  return this;
})();
