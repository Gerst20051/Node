_ = require('underscore');

module.exports = (function () {
  const Room = require('../models/Room');
  const Session = require('../models/Session');

  this.getRoom = (req, res, next) => {
    Room.findById(req.params.roomId, function (err, room) {
      if (err || !room) return res.send(500);
      res.send(200, room);
    });
  };

  this.getRooms = (req, res, next) => {
    Room.find({}, function (err, rooms) {
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
    }, function () {
      res.send(500);
    });
  };

  return this;
})();
