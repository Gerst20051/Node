module.exports = router => {
  const digitalPodcast = require('./controllers/DigitalPodcast');

  router.get('/', (req, res, next) => {
    return res.send('WELCOME TO THE PODCAST REST API');
  });

  router.get('/search/:keywords', digitalPodcast.search);
  router.get('/feed/:url', digitalPodcast.feed);
};
