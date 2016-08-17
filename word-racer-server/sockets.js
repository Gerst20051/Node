module.exports = server => {
  const io = require('socket.io')(server);

  const SOCKETS = {};

  io.sockets.on('connection', socket => {
    socket.id = Math.random();
    socket.on('data', data => {
      console.log('data from client', data);
    });
    socket.on('disconnect', data => {
      delete SOCKETS[socket.id];
      setDataToAllSockets();
    });
    SOCKETS[socket.id] = socket;
    setDataToAllSockets();
  });

  function setDataToAllSockets() {
    Object.keys(SOCKETS).forEach(socketId => {
      SOCKETS[socketId].emit('data', { clients: Object.keys(SOCKETS) });
    });
  }
};
