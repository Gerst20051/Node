_ = require('underscore');

module.exports = (function () {
  const User = require('../models/User');
  const Session = require('../models/Session');

  this.generateResetPasswordToken = (res, user) => {
    const randomstring = require('randomstring');
    const resetPasswordToken = randomstring.generate(40);
    User.generateHash(resetPasswordToken, (err, hash) => {
      if (err) {
        console.log(err);
        return res.send(500);
      }
      user.resetPasswordToken = hash;
      user.resetPasswordExpires = Date.now() + (60 * 60 * 1E3); // expires 1 hour from now
      user.save((err, savedUser) => {
        if (err) {
          console.log(err);
          return res.send(500);
        }
        res.send(200, savedUser);
      });
    });
  };

  this.generateSession = (userId, cb) => {
    const randomstring = require('randomstring');
    const sessionToken = randomstring.generate(40);
    Session.generateHash(sessionToken, (err, hash) => {
      if (err) cb(err);
      const session = new Session();
      session.tokenHash = hash;
      session.userId = userId;
      session.expires = Date.now() + (30 * 24 * 60 * 60 * 1E3); // expires 30 days from now
      session.save(err => {
        cb(err, sessionToken);
      });
    });
  };

  this.checkSession = (req, res, next) => {
    Session.find({ userId: req.params.userId }, function (err, sessions) {
      if (err || !sessions) return res.send(500);
      if (_.some(sessions, function (session) {
        return session.compareTokenSync(req.params.sessionToken);
      })) {
        res.send(200, { success: true });
      } else {
        res.send(500);
      }
    });
  };

  this.login = (req, res, next) => {
    User.getAuthenticated(req.body.user, req.body.pass, this.generateSession, (err, response, reason) => {
      if (err) {
        console.log(err);
        return res.send(500);
      }
      if (!response) {
        const reasons = User.failedLogin;
        switch (reason) {
          case reasons.NOT_FOUND:
          case reasons.PASSWORD_INCORRECT:
            return res.send(404);
          case reasons.MAX_ATTEMPTS:
            return res.send(404);
        }
        return res.send(404);
      }
      res.send(200, response);
    });
  };

  this.register = (req, res, next) => {
    User.generateHash(req.body.pass, (err, hash) => {
      if (err) {
        console.log(err);
        return res.send(500);
      }
      const newUser = new User();
      newUser.username = req.body.username;
      newUser.email = req.body.email;
      newUser.hash = hash;
      newUser.save((err, savedUser) => {
        if (err) { // check for duplicate username or email
          console.log(err);
          return res.send(500);
        }
        this.generateSession(savedUser._id, function (err, sessionToken) {
          if (err) {
            console.log(err);
            return res.send(500);
          }
          res.send(200, {
            sessionToken: sessionToken,
            user: savedUser
          });
        });
      });
    });
  };

  this.forgotPassword = (req, res, next) => {
    if (!req.body.user) {
      return res.send(500);
    }
    const queryParams = {};
    queryParams[~req.body.user.indexOf('@') ? 'email' : 'username'] = req.body.user;
    User.findOne(queryParams, (err, user) => {
      if (err) {
        console.log(err);
        return res.send(500);
      }
      if (!user) {
        return res.send(404);
      }
      this.generateResetPasswordToken(res, user);
    });
  };

  return this;
})();
