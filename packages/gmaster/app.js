/**
 * Node Express application
 */

const express = require("express");
var morgan = require("morgan");

var app = express();

app.use(morgan("dev"));
app.use(express.json());

// DB connection to be reused by all API calls
app.gamesDb = require("./dist/db/db-prisma");

// Rest API
app.use(require("./dist/routes/CreateGame"));
app.use(require("./dist/routes/CheckGame"));
app.use(require("./dist/routes/DropGame"));
app.use(require("./dist/routes/MakeMove"));

module.exports = app;
