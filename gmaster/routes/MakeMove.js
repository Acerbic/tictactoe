var express = require('express');
var router = express.Router();
var games = require('../games');

router.post('/MakeMove/:gameId', function(req, res, next) {

  const gameId = req.params.gameId;

  if (!games.has(gameId)) {
    res.send({
      state: null,
      success: false,
      errorMessage: "Game not found",
      errorCode: 0 // TODO: replace with a regular code
    });
    return;
  }

  const game = games[gameId];
  
});

module.exports = router;
