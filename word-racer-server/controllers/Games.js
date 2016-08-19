module.exports = (function () {
  const Game = require('../models/Game');
  const GameGrid = require('../models/GameGrid');
  const Session = require('../models/Session');

  this.createGame = (req, res, next) => {
    if (!req.body.roomId) return res.send(500);
    Session.isSessionTokenValid(req.body.sessionUserId, req.body.sessionToken, function () {
      const newGame = new Game();
      newGame.roomId = req.body.roomId;
      newGame.save((err, savedGame) => {
        if (err) {
          console.log(err);
          return res.send(500);
        }
        const grids = grid.generateGrids();
        const gridSolutions = grid.generateGridSolutions(savedGame._id, grids);
        const newGameGrids = [];
        for (var gridRoundNumber = 1; gridRoundNumber <= grids.length; gridRoundNumber++) {
          const newGameGrid = new GameGrid();
          newGameGrid.gameId = savedGame._id;
          newGameGrid.roundNumber = gridRoundNumber;
          newGameGrid.grid = grids[gridRoundNumber - 1];
          newGameGrids.push(newGameGrid);
        }
        GameGrid.insertMany(newGameGrids).then((savedGameGrids) => {
          res.send(200);
          sockets.emitToSocketChannel('GameStarted', { gameId: savedGame._id, gameGrids: grids }, socket => {
            return sockets.isUserInRoom(socket.sessionUserId, req.body.roomId);
          });
        }).catch((err) => {
          console.log(err);
          return res.send(500);
        });
      });
    }, () => {
      res.send(500);
    });
  };

  return this;
})();
