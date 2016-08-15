const restify = require('restify');
const config = require('./config');
const app = restify.createServer({ name: 'word-racer-rest-api', version: '1.0.0' });
const db = require('./db');

app.use(restify.fullResponse());
app.use(restify.bodyParser());
app.use(restify.queryParser());

app.listen(config.port, () => {
  console.log('%s listening on port %s', app.name, config.port);
});

const routes = require('./routes')(app);
