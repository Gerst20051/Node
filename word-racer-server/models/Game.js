const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GameSchema = new Schema({
  roomId: { type: Schema.ObjectId, required: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('Game', GameSchema);
