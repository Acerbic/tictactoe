var express = require('express');
var router = express.Router();
var games = require('../games');
var xstate = require('xstate');
var interpreter = require('xstate/lib/interpreter');

let gameId = 1;

const ttt = xstate.Machine({
  id: "tictactoe",
  initial: "waiting for player 1",
  states: {
    "waiting for player 1": {
      on: { PL1_MOVE: "waiting for player 2" },
      on: { PL1_MOVE_W: "player 1 won" },
      on: { LAST_MOVE: "draw" },
    },
    "waiting for player 2": {
      on: { PL2_MOVE: "waiting for player 1" },
      on: { PL2_MOVE_W: "player 2 won" },
    },
    "player 1 won": {
      type: "final"
    },
    "player 2 won": {
      type: "final"
    },
    "draw": {
      type: "final"
    }
  }
})

router.post('/CreateGame', function(req, res, next) {
  const data = req.body;
  const pl1_id = data.player1Id;
  const pl2_id = data.player2Id;

  if (pl1_id && pl2_id) {
    let game = {
      state: interpreter.interpret(ttt).start(),
      player1: pl1_id,
      player2: pl2_id,

      board: new Array(9)
    }
    games[gameId++] = game;

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
