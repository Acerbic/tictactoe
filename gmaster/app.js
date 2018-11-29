var express = require('express');
// var path = require('path');
// var cookieParser = require('cookie-parser');
var logger = require('morgan');

// var createGame = require('./routes/CreateGame');
// var checkGame = require('./routes/CheckGame');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));

// app.use('/', indexRouter);
// app.use('/users', usersRouter);

app.use(require('./routes/CreateGame'));
app.use(require('./routes/CheckGame'));
app.use(require('./routes/DropGame'));
app.use(require('./routes/MakeMove'));

module.exports = app;
