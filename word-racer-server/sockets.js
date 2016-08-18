module.exports = server => {
  const io = require('socket.io')(server);

  const SOCKETS = {};

  io.sockets.on('connection', socket => {
    setupSocket(socket);
    addDataFromClientListener(socket);
    addDisconnectListener(socket);
    sendDataToAllSockets('data', { clients: Object.keys(SOCKETS) });
  });

  function setupSocket(socket) {
    socket.id = Math.random();
    SOCKETS[socket.id] = socket;
  }

  function createSocketListener(socket, key, cb) {
    socket.on(key, cb);
  }

  function addDisconnectListener(socket) {
    createSocketListener(socket, 'disconnect', data => {
      delete SOCKETS[socket.id];
      sendDataToAllSockets();
    });
  }

  function addDataFromClientListener(socket) {
    createSocketListener(socket, 'data', data => {
      console.log('data from client', data);
    });
  }

  function getSockets() {
    return SOCKETS;
  }

  function sendDataToAllSockets(key = 'data', data = {}) {
    Object.keys(SOCKETS).forEach(socketId => {
      SOCKETS[socketId].emit(key, data);
    });
  }

  return {
    getSockets: getSockets,
    sendDataToAllSockets: sendDataToAllSockets
  };
};
