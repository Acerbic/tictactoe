const express = require('express');
var morgan = require('morgan');

var app = express();

app.use(morgan('dev'));
app.use(express.json());

// DB connection to be reused by all API calls
app.gamesDb = require('./db/db-prisma');

// Rest API
app.use(require('./routes/CreateGame'));
app.use(require('./routes/CheckGame'));
app.use(require('./routes/DropGame'));
app.use(require('./routes/MakeMove'));

module.exports = app;
