const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const SALT_WORK_FACTOR = 10;

const schema = new mongoose.Schema({
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

schema.methods.comparePassword = function (password, cb) {
  bcrypt.compare(password, this.hash, cb);
};

schema.statics.generateHash = function (password, cb) {
  bcrypt.hash(password, SALT_WORK_FACTOR, cb);
};

module.exports = mongoose.model('User', schema);
