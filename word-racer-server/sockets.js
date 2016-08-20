module.exports = server => {
  const io = require('socket.io')(server);

  const SOCKETS = {};
  const PLAYERS = {};
  const ROOMS = {};
  const PENDING_EMITS = {};
  const ROOMS_WITH_GAMES_IN_PROGRESS = [];

  io.sockets.on('connection', socket => {
    setupSocket(socket);
    addDisconnectListener(socket);
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
      const roomId = PLAYERS[socket.sessionUserId];
      if (roomId) {
        emitToSocketChannel('PlayerLeft', {
          userId: socket.sessionUserId,
          roomId: roomId
        });
        ROOMS[roomId].splice(ROOMS[roomId].indexOf(roomId), 1);
      }
      checkIfRoomIsNowEmpty(roomId);
    });
  }

  function checkIfRoomIsNowEmpty(roomId) {
    if (_.isArray(ROOMS[roomId]) && _.isEmpty(ROOMS[roomId])) {
      _.each(PENDING_EMITS[roomId], timeoutId => {
        clearTimeout(timeoutId);
      });
      delete PENDING_EMITS[roomId];
      removeRoomFromGameInProgress(roomId);
      // TODO: Save Any Unsaved Data Related To Game Session
    }
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
    const oldRoomId = PLAYERS[userId];
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

  function setRoomToGameInProgress(roomId) {
    ROOMS_WITH_GAMES_IN_PROGRESS.push(roomId);
  }

  function removeRoomFromGameInProgress(roomId) {
    ROOMS_WITH_GAMES_IN_PROGRESS.splice(ROOMS_WITH_GAMES_IN_PROGRESS.indexOf(roomId), 1);
  }

  function doesRoomHaveGameInProgress(roomId) {
    return _.contains(ROOMS_WITH_GAMES_IN_PROGRESS, roomId);
  }

  function isUserInRoom(userId, roomId) {
    return PLAYERS[userId] === roomId;
  }

  function getPlayerCountInRoom(roomId) {
    if (!roomId || !ROOMS[roomId]) return 0;
    return ROOMS[roomId].length;
  }

  function emitSocketToRoomCheck(socket, roomId) {
    return isUserInRoom(socket.sessionUserId, roomId);
  }

  function createGameFutureSocketEmits(roomId, gameId) {
    PENDING_EMITS[roomId] = [];
    const intermissionDurationSeconds = 30; // 30
    const roundDurationSeconds = 120; // 120
    const intermissionDurationInMilliseconds = intermissionDurationSeconds * 1E3;
    const roundDurationInMilliseconds = roundDurationSeconds * 1E3;
    const numOfRounds = 6;
    var accumulatedDurationInMilliseconds = 0;
    for (var i = 1; i <= numOfRounds; i++) {
      accumulatedDurationInMilliseconds += intermissionDurationInMilliseconds;
      ((roundNumber, delay) => {
        PENDING_EMITS[roomId].push(setTimeout(() => {
          emitToSocketChannel('StartRound', { roundNumber: roundNumber, duration: roundDurationInMilliseconds }, _.partial(emitSocketToRoomCheck, _, roomId));
          PENDING_EMITS[roomId].shift();
        }, delay));
      })(i, accumulatedDurationInMilliseconds);
      accumulatedDurationInMilliseconds += roundDurationInMilliseconds;
      ((roundNumber, delay, roomId) => {
        const isGameOver = i === numOfRounds;
        PENDING_EMITS[roomId].push(setTimeout(() => {
          emitToSocketChannel(isGameOver ? 'GameOver' : 'StartIntermission', isGameOver ? { duration: intermissionDurationInMilliseconds } : { roundNumber: roundNumber + 1, duration: intermissionDurationInMilliseconds }, _.partial(emitSocketToRoomCheck, _, roomId));
          PENDING_EMITS[roomId].shift();
          if (isGameOver) {
            removeRoomFromGameInProgress(roomId);
          }
        }, delay));
      })(i, accumulatedDurationInMilliseconds, roomId);
    }
  }

  return {
    addUserToGameRoom: addUserToGameRoom,
    createGameFutureSocketEmits: createGameFutureSocketEmits,
    doesRoomHaveGameInProgress: doesRoomHaveGameInProgress,
    emitToSocketChannel: emitToSocketChannel,
    getPlayerCountInRoom: getPlayerCountInRoom,
    getSockets: getSockets,
    isUserInRoom: isUserInRoom,
    removeRoomFromGameInProgress: removeRoomFromGameInProgress,
    setRoomToGameInProgress: setRoomToGameInProgress
  };
};
