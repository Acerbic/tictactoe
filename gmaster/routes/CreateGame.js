var express = require('express');
var router = express.Router();
const GameMachine = require('../game/game-machine');

let gameId = 1;

router.post('/CreateGame', function(req, res, next) {
  const data = req.body;
  const p1_id = parseInt(data.player1Id);
  const p2_id = parseInt(data.player2Id);
  const gamesDb = req.app.gamesDb;

  if (p1_id && p2_id) {
    let game = {
      state: JSON.stringify(GameMachine.initialState),
      player1: p1_id,
      player2: p2_id,

      board: new Array(9)
    }
    gamesDb.set(gameId++, game);

    res.send({
      success: true,
      gameId: gameId-1
    });
  } else {
    res.send({
      success: false,
      errorMessage: "Failed to create a new game",
      errorCode: 0 // TODO: replace with a proper code
    });
  }
});

module.exports = router;
