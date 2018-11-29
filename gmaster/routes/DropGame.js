var express = require('express');
var router = express.Router();
var games = require('../games');

router.post('/DropGame/:gameId', function(req, res, next) {
  const gameId = req.params.gameId;

  if (games.has(gameId)) {

    games.delete(gameId);
    res.send({
      success: true,
    });

  } else {
    res.send({
      success: false,
      errorMessage: "Can't drop - game not found",
      errorCode: 0 // TODO: replace with a proper code
    });
  }
});

module.exports = router;
