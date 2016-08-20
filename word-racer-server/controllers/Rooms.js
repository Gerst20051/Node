module.exports = (function () {
  const Room = require('../models/Room');
  const Session = require('../models/Session');

  this.getRoom = (req, res, next) => {
    Room.findById(req.params.roomId, (err, room) => {
      if (err || !room) return res.send(500);
      if (req.params.join) {
        sockets.addUserToGameRoom(req.params.sessionUserId, req.params.roomId); // verify session token / user id and lookup username
        if (sockets.doesRoomHaveGameInProgress(req.params.roomId)) {
          const gameId = sockets.getGameIdFromRoomId(req.params.roomId);
          const intermissionDurationSeconds = 10;
          const roundDurationSeconds = 20;
          const intermissionDurationInMilliseconds = intermissionDurationSeconds * 1E3;
          const roundDurationInMilliseconds = roundDurationSeconds * 1E3;
          return res.send(200, {
            gameGrids: grid.getGameGridsForGame(gameId),
            gameId: gameId,
            intermissionDuration: intermissionDurationInMilliseconds,
            roomId: req.params.roomId,
            roundDuration: roundDurationInMilliseconds
          });
        }
      }
      res.send(200, room);
    });
  };

  this.getRooms = (req, res, next) => {
    Room.find({}, (err, rooms) => {
      if (err || !rooms) return res.send(500);
      const newRooms = _.map(rooms, room => {
        return {
          _id: room._id,
          playerCount: sockets.getPlayerCountInRoom(room._id)
        };
      });
      res.send(200, newRooms);
    });
  };

  this.createRoom = (req, res, next) => {
    Session.isSessionTokenValid(req.body.sessionUserId, req.body.sessionToken, function () {
      const newRoom = new Room();
      newRoom.ownerId = req.body.sessionUserId;
      newRoom.save((err, savedRoom) => {
        if (err) {
          console.log(err);
          return res.send(500);
        }
        res.send(200, savedRoom);
      });
    }, () => {
      res.send(500);
    });
  };

  return this;
})();
