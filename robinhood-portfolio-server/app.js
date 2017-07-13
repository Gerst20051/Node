global._ = require('underscore');
global.__ = require('lodash');

const restify = require('restify');
const config = require('./config');
const app = restify.createServer({ name: 'robinhood-portfoio-rest-api', version: '1.0.0' });
const db = require('./db');

global.globalConfig = config;

app.use(restify.fullResponse());
app.use(restify.bodyParser());
app.use(restify.queryParser());

app.listen(config.port, () => {
  console.log('%s listening on port %s', app.name, config.port);
});

const routes = require('./routes')(app);
global.sockets = require('./sockets')(app.server);
