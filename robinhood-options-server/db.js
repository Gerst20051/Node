const mongoose = require('mongoose');
const config = require('./config');

mongoose.Promise = Promise;
mongoose.connect(config.creds.mongodb, { useNewUrlParser: true });

const db = mongoose.connection;

db.once('open', () => {
  console.log('successfully opened the db');
});

db.on('error', error => {
  console.log('error occurred from db');
  throw new Error(error);
});

module.exports = mongoose;
