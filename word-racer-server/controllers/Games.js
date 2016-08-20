module.exports = (function () {
  const Game = require('../models/Game');
  const GameGrid = require('../models/GameGrid');
  const Session = require('../models/Session');

  const intermissionDurationSeconds = 10; // 30
  const roundDurationSeconds = 20; // 120
  const intermissionDurationInMilliseconds = intermissionDurationSeconds * 1E3;
  const roundDurationInMilliseconds = roundDurationSeconds * 1E3;

  this.createGame = (req, res, next) => {
    if (!req.body.roomId || sockets.doesRoomHaveGameInProgress(req.body.roomId) || !sockets.isUserInRoom(req.body.sessionUserId, req.body.roomId)) return res.send(500);
    Session.isSessionTokenValid(req.body.sessionUserId, req.body.sessionToken, function () {
      const newGame = new Game();
      newGame.roomId = req.body.roomId;
      newGame.save((err, savedGame) => {
        if (err) {
          console.log(err);
          sockets.removeRoomFromGameInProgress(req.body.roomId);
          return res.send(500);
        }
        sockets.setRoomToGameInProgress(req.body.roomId, savedGame._id);
        const grids = grid.generateGrids();
        grid.generateGridSolutions(savedGame._id, grids);
        const newGameGrids = [];
        for (var gridRoundNumber = 1; gridRoundNumber <= grids.length; gridRoundNumber++) {
          const newGameGrid = new GameGrid();
          newGameGrid.gameId = savedGame._id;
          newGameGrid.roundNumber = gridRoundNumber;
          newGameGrid.grid = grids[gridRoundNumber - 1];
          newGameGrids.push(newGameGrid);
        }
        GameGrid.insertMany(newGameGrids).then(savedGameGrids => {
          res.send(200);
          sockets.createGameFutureSocketEmits(req.body.roomId, savedGame._id);
          sockets.emitToSocketChannel('GameStarted', {
            gameGrids: grids,
            gameId: savedGame._id,
            intermissionDuration: intermissionDurationInMilliseconds,
            roomId: req.body.roomId,
            roundDuration: roundDurationInMilliseconds
          }, socket => {
            return sockets.isUserInRoom(socket.sessionUserId, req.body.roomId);
          });
          // }, _.partial(sockets.emitSocketToRoomCheck, _, req.body.roomId));
        }).catch(err => {
          console.log(err);
          return res.send(500);
        });
      });
    }, () => {
      res.send(500);
    });
  };

  this.checkWord = (req, res, next) => {

  };

  return this;
})();
