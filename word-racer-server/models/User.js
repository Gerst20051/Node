const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const SALT_WORK_FACTOR = 10;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 2 * 60 * 60 * 1E3; // lockout account for 2 hours

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, index: { unique: true }, trim: true},
  email: { type: String, required: true, index: { unique: true }, trim: true},
  hash: { type: String, required: true },
  loginAttempts: { type: Number, required: true, default: 0 },
  lockUntil: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true
});

// stats (games played / won, win ratio, rank, top score)
// friends, followers, subscribe alerts

UserSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

UserSchema.methods.incLoginAttempts = function (cb) {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.update({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    }, cb);
  }
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME };
  }
  return this.update(updates, cb);
};

UserSchema.methods.comparePassword = function (password, cb) {
  bcrypt.compare(password, this.hash, cb);
};

UserSchema.statics.generateHash = function (password, cb) {
  bcrypt.hash(password, SALT_WORK_FACTOR, cb);
};

const reasons = UserSchema.statics.failedLogin = {
  NOT_FOUND: 0,
  PASSWORD_INCORRECT: 1,
  MAX_ATTEMPTS: 2
};

UserSchema.statics.getAuthenticated = function (userInput, password, generateSession, cb) {
  const queryParams = {};
  queryParams[~userInput.indexOf('@') ? 'email' : 'username'] = userInput;
  this.findOne(queryParams, function (err, user) {
    if (err) return cb(err);
    if (!user) return cb(null, null, reasons.NOT_FOUND);
    if (user.isLocked) {
      return user.incLoginAttempts(function (err) {
        if (err) return cb(err);
        return cb(null, null, reasons.MAX_ATTEMPTS);
      });
    }
    user.comparePassword(password, function (err, isMatch) {
      if (err) return cb(err);
      if (!isMatch) {
        return user.incLoginAttempts(function (err) {
          if (err) return cb(err);
          return cb(null, null, reasons.PASSWORD_INCORRECT);
        });
      }
      generateSession(user._id, function (err, sessionToken) {
        if (err) cb(err);
        const userData = {
          sessionToken: sessionToken,
          user: user
        };
        if (!user.loginAttempts && !user.lockUntil) return cb(null, userData);
        const updates = {
          $set: { loginAttempts: 0 },
          $unset: { lockUntil: 1 }
        };
        return user.update(updates, function (err) {
          if (err) return cb(err);
          return cb(null, userData);
        });
      });
    });
  });
};

module.exports = mongoose.model('User', UserSchema);
