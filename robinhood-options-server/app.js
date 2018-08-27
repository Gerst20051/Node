global._ = require('underscore');
global.__ = require('lodash');

const restify = require('restify');
const config = require('./config');
const app = restify.createServer({ name: 'robinhood-options-rest-api', version: '1.0.0' });
const db = require('./db');

global.globalConfig = config;

// TODO: Look at http://restify.com/docs/4to5/
// By default, queryParser and bodyParser no longer map req.query and req.body to req.params. To get the old behavior, please enable the mapParams behavior with these plugins.
app.use(restify.plugins.fullResponse());
app.use(restify.plugins.bodyParser());
app.use(restify.plugins.queryParser());

app.listen(config.port, () => {
  console.log('%s listening on port %s', app.name, config.port);
});

const routes = require('./routes')(app);
global.sockets = require('./sockets')(app.server);
