const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RoomSchema = new Schema({
  ownerId: { type: Schema.ObjectId, required: true }
}, {
  timestamps: true
});

// public vs private. private rooms won't show up in the game room list but will have a link to share with friends.
// game options. fast pace, rated / ranked, skill level (beginner, intermediate, advanced).

module.exports = mongoose.model('Room', RoomSchema);
