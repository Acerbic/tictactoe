import * as express from 'express';
import * as xstate from 'xstate';
import { GameId, Game, DbConnector } from '../db/db.js'


const router = express.Router();

/**
 * Check the state of a game, if it exists
 */
router.get('/CheckGame/:gameId', async function(req, res, next) {
  const gameId = req.params.gameId as GameId;
  const gamesDb = (req.app as any).gamesDb as DbConnector; // faceplum

  try {
    gamesDb.LoadGame(gameId)
    .then( game => {

      const current_state = xstate.State.create(JSON.parse(game.state));

      res.send({
        success: true,
        state: current_state.value
      })

    });
  }
  catch (ex) {
    res.send({
      state: null,
      success: false,
      errorMessage: "Game not found",
      errorCode: 0 // TODO: replace with a regular code
    });
  }
});

export = router;
