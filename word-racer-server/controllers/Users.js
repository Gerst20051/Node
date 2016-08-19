module.exports = (function () {
  const User = require('../models/User');

  this.getUser = (req, res, next) => {
    User.findById(req.params.userId, function (err, user) {
      if (err || !user) return res.send(500);
      res.send(200, user);
    });
  };

  this.getUsers = (req, res, next) => {
    User.find({}, function (err, users) {
      if (err || !users) return res.send(500);
      res.send(200, users);
    });
  };

  return this;
})();
