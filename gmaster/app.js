var express = require('express');
var logger = require('morgan');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.gamesDb = require('./games');

app.use(require('./routes/CreateGame'));
app.use(require('./routes/CheckGame'));
app.use(require('./routes/DropGame'));
app.use(require('./routes/MakeMove'));

module.exports = app;
