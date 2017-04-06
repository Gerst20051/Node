module.exports = (function () {
  const Promise = require('promise');
  const request = require('request');
  const querystring = require('querystring');
  const parseXmlString = require('xml2js').parseString;

  const baseDomain = 'http://api.digitalpodcast.com/v2r';

  this.apiSearch = keywords => {
    const params = {
      appid: 'podcastsearchdemo',
      keywords: keywords,
      results: 50
    };
    const options = {
      url: `${baseDomain}/search/?${querystring.stringify(params)}`
    };
    return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        if (error) reject(error);
        else {
          parseXmlString(body, (error, result) => {
            if (error) reject(error);
            else resolve(result);
          });
        }
      });
    });
  };

  this.apiFeed = url => {
    return new Promise((resolve, reject) => {
      request({ url: url }, (error, response, body) => {
        if (error) reject(error);
        else {
          parseXmlString(body, (error, result) => {
            if (error) reject(error);
            else resolve(result);
          });
        }
      });
    });
  };

  return this;
})();
