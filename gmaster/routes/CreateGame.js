var express = require('express');
var router = express.Router();
const GameMachine = require('../game/game-machine');

router.post('/CreateGame', function(req, res, next) {
  const p1_id = parseInt(req.body.player1Id);
  const p2_id = parseInt(req.body.player2Id);
  const gamesDb = req.app.gamesDb;

  if (p1_id && p2_id) {
    // let gameId// = gamesDb.GenerateNewId();

    let game = {
      state: JSON.stringify(GameMachine.initialState),
      player1: p1_id,
      player2: p2_id,

      board: JSON.stringify(GameMachine.initialState.context.board)
    }
    
    gamesDb.CreateGame(game)
    .then(gameId => {
      res.send({
        success: true,
        gameId: gameId
      });
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
