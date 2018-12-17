var express = require('express');
var router = express.Router();

const xstate = require('xstate');
const { interpret } = require('xstate/lib/interpreter');
const GameMachine = require('../game/game-machine');

router.post('/MakeMove/:gameId', function(req, res, next) {
  const gameId = req.params.gameId;
  const gamesDb = req.app.gamesDb;
  // console.log("sending ["+gameId+"]");

  gamesDb.LoadGame(gameId)
  .then( game => {

    // restore the machine
    const current_state = xstate.State.create(JSON.parse(game.state));
    const service = interpret(GameMachine).start(current_state);

    // read request data
    const playerId = req.body.playerId;
    const column = req.body.move && req.body.move.column && parseInt(req.body.move.column);
    const row    = req.body.move && req.body.move.row && parseInt(req.body.move.row);

    // Perform various checks on request data
    if (current_state.value.game !== "wait") {
      res.send({
        state: current_state.value,
        success: false,
        errorMessage: "Game already ended",
        errorCode: 0 // TODO: replace with a regular code
      });
      return;
    }
    if (game[current_state.value.turn] !== playerId) {
      res.send({
        state: current_state.value,
        success: false,
        errorMessage: "Wrong player",
        errorCode: 0 // TODO: replace with a regular code
      });
      return;
    }
    if (!Number.isInteger(column) || column < 0 || column > 2 || 
        !Number.isInteger(row) || row < 0 || row > 2)
    {
      res.send({
        success: false,
        errorMessage: "Malformed move",
        errorCode: 0 // TODO: replace with a regular code
      });
      return;
    }
    if (current_state.context.board[row][column] !== null) {
      res.send({
        success: false,
        errorMessage: "Bad move - cell already taken",
        errorCode: 0 // TODO: replace with a regular code
      });
      return;
    }

    // advance the machine
    const new_state = service.send({
      type: "MOVE",
      move: {column, row},
      playerId
    });
    gamesDb.SaveGame(gameId, {
      state: JSON.stringify(new_state),
      board: JSON.stringify(new_state.context.board)
    })
    .then( () => {
      // wait for saving to finish and 
      // send result in reply
      res.send({
        success: true,
        newState: new_state.value
      });
    });
  })
  .catch(ex => {
    res.send({
      state: null,
      success: false,
      errorMessage: "Game was not loaded from DB: " + ex,
      errorCode: 0 // TODO: replace with a regular code
    });
    return;
  });
});

module.exports = router;
