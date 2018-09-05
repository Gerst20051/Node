module.exports = server => {
  const io = require('socket.io')(server);

  const SOCKETS = {};

  io.sockets.on('connection', socket => {
    setupSocket(socket);
    addDisconnectListener(socket);
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
    });
  }

  function getSockets() {
    return SOCKETS;
  }

  function emitToSocketChannel(channel = 'data', data = {}, cb) {
    Object.keys(SOCKETS).forEach(socketId => {
      if (!cb || cb(SOCKETS[socketId])) {
        SOCKETS[socketId].emit(channel, data);
      }
    });
  }

  return {
    emitToSocketChannel: emitToSocketChannel,
    getSockets: getSockets,
  };
};
