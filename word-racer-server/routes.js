module.exports = router => {
  const authentication = require('./controllers/Authentication');
  const users = require('./controllers/Users');
  const rooms = require('./controllers/Rooms');

  router.get('/', (req, res, next) => {
    return res.send('WELCOME TO THE WORD RACER REST API');
  });

  router.get('/checksession', authentication.checkSession);
  router.post('/login', authentication.login);
  router.post('/register', authentication.register);
  router.post('forgotpassword', authentication.forgotPassword);

  router.get('/user', users.getUser);
  router.get('/users', users.getUsers);

  router.get('/room', rooms.getRoom);
  router.get('/rooms', rooms.getRooms);
  router.post('/createroom', rooms.createRoom);
};
