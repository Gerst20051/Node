module.exports = server => {
  const io = require('socket.io')(server);

  const SOCKETS = {};
  const PLAYERS = {};
  const ROOMS = {};

  io.sockets.on('connection', socket => {
    setupSocket(socket);
    addDisconnectListener(socket);
    addStartGameListener(socket);
  });

  function setupSocket(socket) {
    socket.id = Math.random();
    socket.sessionUserId = socket.handshake.query.sessionUserId;
    SOCKETS[socket.id] = socket;
  }

  function createSocketListener(socket, key, cb) {
    socket.on(key, cb);
  }

  function addDisconnectListener(socket) {
    createSocketListener(socket, 'disconnect', data => {
      delete SOCKETS[socket.id];
      var roomId = PLAYERS[socket.sessionUserId];
      if (roomId) {
        emitToSocketChannel('PlayerLeft', {
          userId: socket.sessionUserId,
          roomId: roomId
        });
        ROOMS[roomId].splice(ROOMS[roomId].indexOf(roomId), 1);
      }
      // if the room is now empty and a game is ongoing stop the game.
    });
  }

  function addStartGameListener(socket) {
    createSocketListener(socket, 'StartGame', data => {
      console.log('data from client', data);
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

  function addUserToGameRoom(userId, roomId) {
    var oldRoomId = PLAYERS[userId];
    if (oldRoomId) {
      emitToSocketChannel('PlayerLeft', {
        userId: userId,
        roomId: oldRoomId
      });
      ROOMS[oldRoomId].splice(ROOMS[oldRoomId].indexOf(oldRoomId), 1);
    }
    PLAYERS[userId] = roomId;
    if (!ROOMS[roomId]) {
      ROOMS[roomId] = [];
    }
    ROOMS[roomId].push(userId);
    emitToSocketChannel('PlayerJoined', {
      userId: userId,
      roomId: roomId
    });
  }

  function isUserInRoom(userId, roomId) {
    return PLAYERS[userId] === roomId;
  }

  return {
    addUserToGameRoom: addUserToGameRoom,
    getSockets: getSockets,
    emitToSocketChannel: emitToSocketChannel,
    isUserInRoom: isUserInRoom
  };
};
