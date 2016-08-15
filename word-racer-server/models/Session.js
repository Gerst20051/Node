const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
  token: { type: String, required: true, index: { unique: true }, trim: true},
  user: { type: Schema.ObjectId, required: true, index: true },
  expires: { type: Date, required: true }
});

module.exports = mongoose.model('Session', schema);
