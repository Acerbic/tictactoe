var express = require('express');
var router = express.Router();

router.post('/DropGame/:gameId', function(req, res, next) {
  const gameId = parseInt(req.params.gameId);
  const gamesDb = req.app.gamesDb;

  if (gamesDb.HasGame(gameId)) {
    gamesDb.DropGame(gameId);
    res.send({
      success: true,
    });
  }
  else {
    res.send({
      success: false,
      errorMessage: "Can't drop - game not found",
      errorCode: 0 // TODO: replace with a proper code
    });
  }
});

module.exports = router;
