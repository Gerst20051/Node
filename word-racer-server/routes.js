module.exports = router => {
  const authentication = require('./controllers/Authentication');

  router.get('/', (req, res, next) => {
    return res.send('WELCOME TO THE WORD RACER REST API');
  });

  router.get('/checksession', authentication.checkSession);

  router.post('/login', authentication.login);

  router.post('/register', authentication.register);

  router.post('forgotpassword', authentication.forgotPassword);

  router.get('/users', (req, res, next) => {
    return res.send('USERS');
  });

  router.get('/rooms', (req, res, next) => {
    return res.send('ROOMS');
  });

  router.post('/createroom', (req, res, next) => {
    return res.send('CREATE ROOM');
  });
};
