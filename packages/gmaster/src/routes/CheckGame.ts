import * as express from "express";
import { State } from "xstate";
import { DbConnector } from "../db/db";
import { GameId, CheckGameResponse, APIResponseFailure } from "./api";
import { GameContext, GameEvent, GameSchema } from "../game/game-schema";
import { GameStateValueToApi } from "../game/game-machine";
import { makeFailureResponse } from "./utils";

const router = express.Router();

/**
 * Check the state of a game, if it exists
 */
router.get("/CheckGame/:gameId", async function(req, res, next) {
    const gameId = req.params.gameId as GameId;
    const gamesDb = req.app.get("gamesDb") as DbConnector;

    gamesDb
        .LoadGame(gameId)
        .then(game => {
            const current_state: State<
                GameContext,
                GameEvent,
                GameSchema
            > = State.create(JSON.parse(game.state));
            const response: CheckGameResponse = {
                success: true,
                state: GameStateValueToApi(current_state)
            };
            res.send(response);
        })
        .catch(err => {
            // TODO: replace with a proper error code
            const response: APIResponseFailure = makeFailureResponse(
                err,
                "Game not found",
                0
            );
            res.send(response);
        });
});

export default router;
