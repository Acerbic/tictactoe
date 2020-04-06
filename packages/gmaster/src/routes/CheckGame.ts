import * as express from "express";
import * as xstate from "xstate";
import { GameId, Game, DbConnector } from "../db/db.js";
import { CheckGameRequest, CheckGameResponse } from "gmasterREST";

const router = express.Router();

/**
 * Check the state of a game, if it exists
 */
router.get("/CheckGame/:gameId", async function(req, res, next) {
    const gameId = req.params.gameId as GameId;
    const gamesDb = (req.app as any).gamesDb as DbConnector; // faceplum

    try {
        gamesDb.LoadGame(gameId).then(game => {
            const current_state = xstate.State.create(JSON.parse(game.state));
            const response: CheckGameResponse = {
                success: true,
                state: current_state.value
            };
            res.send(response);
        });
    } catch (ex) {
        const response: CheckGameResponse = {
            state: null,
            success: false,
            errorMessage: "Game not found",
            errorCode: 0 // TODO: replace with a regular code
        };
        res.send(response);
    }
});

export = router;
