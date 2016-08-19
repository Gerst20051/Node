const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GameGridSchema = new Schema({
  gameId: { type: Schema.ObjectId, required: true },
  roundNumber: { type: Number, required: true },
  grid: { type: Schema.Types.Mixed }
}, {
  timestamps: true
});

module.exports = mongoose.model('GameGrid', GameGridSchema);
