var express = require('express');
var router = express.Router();
var games = require('../games');

/**
 * Check the state of a game, if it exists
 */
router.get('/CheckGame/:gameId', async function(req, res, next) {
  const gameId = req.params.gameId;

  if (games.has(gameId)) {
    res.send({
      success: true,
      state: games[gameId].state
    })
  } else {
    res.send({
      state: null,
      success: false,
      errorMessage: "Game not found",
      errorCode: 0 // TODO: replace with a regular code
    });
  }
});

module.exports = router;
