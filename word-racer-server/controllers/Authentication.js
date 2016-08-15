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

    this.checkSession = (req, res, next) => {
      console.log(req.body.user);
      console.log(req.body.session);
      return res.send('CHECK SESSION');
    };

    this.login = (req, res, next) => {
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
        user.comparePassword(req.body.pass, (err, isMatch) => {
          if (err || !isMatch) { return res.send(404); }
          res.send(200, user);
        });
      });
    };

    this.register = (req, res, next) => {
      User.generateHash(req.body.pass, (err, hash) => {
        if (err) {
          console.log(err);
          return res.send(500);
        }
        const newUser = new User();
        newUser.username = req.body.user;
        newUser.email = req.body.email;
        newUser.hash = hash;
        newUser.save((err, savedUser) => {
          if (err) { // check for duplicate username or email
            console.log(err);
            return res.send(500);
          }
          res.send(200, savedUser);
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
