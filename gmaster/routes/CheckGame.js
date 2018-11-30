const express = require('express');
const router = express.Router();

const xstate = require('xstate');

/**
 * Check the state of a game, if it exists
 */
router.get('/CheckGame/:gameId', async function(req, res, next) {
  const gameId = parseInt(req.params.gameId);
  const gamesDb = req.app.gamesDb;

  if (gamesDb.has(gameId)) {
    const current_state = xstate.State.create(JSON.parse(gamesDb.get(gameId).state));

    res.send({
      success: true,
      state: current_state.value
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
