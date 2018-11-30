var express = require('express');
var router = express.Router();

const xstate = require('xstate');
const interpret = require('xstate/lib/interpreter');
const { GameMachine } = require('../game/game-machine');

router.post('/MakeMove/:gameId', function(req, res, next) {
  const game_id = parseInt(req.params.gameId);
  const gamesDb = req.app.gamesDb;

  if (!gamesDb.has(game_id)) {
    res.send({
      state: null,
      success: false,
      errorMessage: "Game not found",
      errorCode: 0 // TODO: replace with a regular code
    });
    return;
  }

  const game = gamesDb.get(game_id);
  const current_state = xstate.State.create(JSON.parse(game.state));
  const service = interpret(GameMachine).start(current_state);
});

module.exports = router;
