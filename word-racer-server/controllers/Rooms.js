module.exports = (function () {
  const Room = require('../models/Room');
  const Session = require('../models/Session');

  this.getRoom = (req, res, next) => {
    Room.findById(req.params.roomId, (err, room) => {
      if (err || !room) return res.send(500);
      if (req.params.join) {
        sockets.addUserToGameRoom(req.params.sessionUserId, req.params.roomId); // verify session token / user id and lookup username
      }
      res.send(200, room);
    });
  };

  this.getRooms = (req, res, next) => {
    Room.find({}, (err, rooms) => {
      if (err || !rooms) return res.send(500);
      res.send(200, rooms);
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
