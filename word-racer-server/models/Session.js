const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcryptjs');
const SALT_WORK_FACTOR = 10;

const SessionSchema = new Schema({
  tokenHash: { type: String, required: true, index: { unique: true }, trim: true },
  userId: { type: Schema.ObjectId, required: true },
  expires: { type: Date, required: true }
});

SessionSchema.methods.compareToken = function (token, cb) {
  bcrypt.compare(token, this.tokenHash, cb);
};

SessionSchema.methods.compareTokenSync = function (token) {
  return bcrypt.compareSync(token, this.tokenHash);
};

SessionSchema.statics.generateHash = function (token, cb) {
  bcrypt.hash(token, SALT_WORK_FACTOR, cb);
};

SessionSchema.statics.isSessionTokenValid = function (userId, token, success, failure) {
  this.find({ userId: userId, expires: { $gt: new Date() }}, function (err, sessions) {
    if (err || !sessions) return failure();
    if (_.some(sessions, function (session) {
      return session.compareTokenSync(token);
    })) {
      success();
    } else {
      failure();
    }
  });
};

module.exports = mongoose.model('Session', SessionSchema);
