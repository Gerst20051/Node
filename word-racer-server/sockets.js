module.exports = server => {
  const io = require('socket.io')(server);
  const User = require('./models/User');

  const SOCKETS = {};
  const PLAYERS = {};
  const USERS = {};
  const ROOMS = {};
  const GAMES = {};
  const PENDING_EMITS = {};
  const GAME_STATUS = {};

  io.sockets.on('connection', socket => {
    setupSocket(socket);
    setupUser(socket.sessionUserId);
    addDisconnectListener(socket);
  });

  function setupSocket(socket) {
    socket.id = Math.random();
    socket.sessionUserId = socket.handshake.query.sessionUserId;
    SOCKETS[socket.id] = socket;
  }

  function setupUser(userId) {
    User.findById(userId).then(user => {
      USERS[userId] = {
        username: user.username
      };
    });
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
        delete PLAYERS[socket.sessionUserId];
        delete USERS[socket.sessionUserId];
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
    const userDetails = getUserDetails(userId);
    const oldRoomId = PLAYERS[userId];
    if (oldRoomId) {
      emitToSocketChannel('PlayerLeft', {
        userId: userId,
        roomId: oldRoomId
      });
      ROOMS[oldRoomId].splice(ROOMS[oldRoomId].indexOf(userId), 1);
    }
    PLAYERS[userId] = roomId;
    if (!ROOMS[roomId]) {
      ROOMS[roomId] = [];
    }
    ROOMS[roomId].push(userId);
    emitToSocketChannel('PlayerJoined', {
      userId: userId,
      username: userDetails.username,
      roomId: roomId
    });
  }

  function setRoomToGameInProgress(roomId, gameId) {
    GAMES[roomId] = gameId;
  }

  function removeRoomFromGameInProgress(roomId) {
    delete GAMES[roomId];
  }

  function doesRoomHaveGameInProgress(roomId) {
    return !!GAMES[roomId];
  }

  function getGameStatusForRoomId(roomId) {
    if (doesRoomHaveGameInProgress(roomId)) {
      const gameStatus = GAME_STATUS[getGameIdFromRoomId(roomId)];
      gameStatus.currentTime = _.now();
      return gameStatus;
    }
    return null;
  }

  function getRoundNumberForGameId(gameId) {
    return GAME_STATUS[gameId].roundNumber;
  }

  function getRoomIdFromGameId(gameId) {
    return GAME_STATUS[gameId].roomId;
  }

  function getGameIdFromRoomId(roomId) {
    return GAMES[roomId];
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
    const intermissionDurationSeconds = 10; // 30
    const roundDurationSeconds = 20; // 120
    const intermissionDurationInMilliseconds = intermissionDurationSeconds * 1E3;
    const roundDurationInMilliseconds = roundDurationSeconds * 1E3;
    const numOfRounds = 6;
    GAME_STATUS[gameId] = {
      gameOver: false,
      gameStartedTime: _.now(),
      intermission: false,
      intermissionDuration: intermissionDurationInMilliseconds,
      lastUpdateTime: _.now(),
      roomId: roomId,
      roundDuration: roundDurationInMilliseconds,
      roundNumber: 1,
      started: false
    };
    var accumulatedDurationInMilliseconds = 0;
    for (var i = 1; i <= numOfRounds; i++) {
      accumulatedDurationInMilliseconds += intermissionDurationInMilliseconds;
      ((roundNumber, delay) => {
        const gridSolutions = grid.getGridSolutionsByGameIdAndRoundNumber(gameId, roundNumber);
        PENDING_EMITS[roomId].push(setTimeout(() => {
          GAME_STATUS[gameId].intermission = false;
          GAME_STATUS[gameId].lastUpdateTime = _.now();
          GAME_STATUS[gameId].roundNumber = roundNumber;
          GAME_STATUS[gameId].started = true;
          emitToSocketChannel('StartRound', { roundNumber: roundNumber, duration: roundDurationInMilliseconds, solutionsCount: gridSolutions.length }, _.partial(emitSocketToRoomCheck, _, roomId));
          PENDING_EMITS[roomId].shift();
        }, delay));
      })(i, accumulatedDurationInMilliseconds);
      accumulatedDurationInMilliseconds += roundDurationInMilliseconds;
      ((roundNumber, delay, roomId) => {
        const isGameOver = i === numOfRounds;
        const gridSolutions = grid.getGridSolutionsByGameIdAndRoundNumber(gameId, roundNumber);
        PENDING_EMITS[roomId].push(setTimeout(() => {
          GAME_STATUS[gameId].gameOver = isGameOver;
          GAME_STATUS[gameId].intermission = true;
          GAME_STATUS[gameId].lastUpdateTime = _.now();
          GAME_STATUS[gameId].roundNumber = roundNumber;
          emitToSocketChannel(
            isGameOver ? 'GameOver' : 'StartIntermission',
            isGameOver ? { duration: intermissionDurationInMilliseconds, solutions: gridSolutions } : { roundNumber: roundNumber + 1, duration: intermissionDurationInMilliseconds, solutions: gridSolutions },
            _.partial(emitSocketToRoomCheck, _, roomId)
          );
          PENDING_EMITS[roomId].shift();
          if (isGameOver) {
            removeRoomFromGameInProgress(roomId);
          }
        }, delay));
      })(i, accumulatedDurationInMilliseconds, roomId);
    }
  }

  function getUserDetails(userId) {
    return USERS[userId];
  }

  return {
    addUserToGameRoom: addUserToGameRoom,
    createGameFutureSocketEmits: createGameFutureSocketEmits,
    doesRoomHaveGameInProgress: doesRoomHaveGameInProgress,
    emitToSocketChannel: emitToSocketChannel,
    getGameIdFromRoomId: getGameIdFromRoomId,
    getGameStatusForRoomId: getGameStatusForRoomId,
    getPlayerCountInRoom: getPlayerCountInRoom,
    getRoomIdFromGameId: getRoomIdFromGameId,
    getRoundNumberForGameId: getRoundNumberForGameId,
    getSockets: getSockets,
    getUserDetails: getUserDetails,
    isUserInRoom: isUserInRoom,
    removeRoomFromGameInProgress: removeRoomFromGameInProgress,
    setRoomToGameInProgress: setRoomToGameInProgress
  };
};
