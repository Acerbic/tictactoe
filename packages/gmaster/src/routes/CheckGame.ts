import * as express from "express";
import { State } from "xstate";
import { DbConnector } from "../db/db";
import {
    GameId,
    CheckGameResponse,
    APIResponseFailure
} from "@trulyacerbic/ttt-apis/gmaster-api";
import { GameState } from "../game/game-schema";
import { GameStateValueToApi } from "../game/game-machine";
import { makeFailureResponse } from "./utils";

const router = express.Router();

/**
 * Check the state of a game, if it exists
 */
router.get("/CheckGame/:gameId", async function (req, res, next) {
    const gameId = req.params.gameId as GameId;
    const gamesDb = req.app.get("gamesDb") as DbConnector;

    gamesDb
        .LoadGame(gameId)
        .then(game => {
            const current_state: GameState = State.create(
                JSON.parse(game.state)
            );
            const response: CheckGameResponse = {
                success: true,
                state: GameStateValueToApi(current_state)
            };
            res.send(response);
        })
        .catch(err => {
            const response: APIResponseFailure = makeFailureResponse(
                err,
                "Call to CheckGame failed"
            );
            res.send(response);
        });
});

export default router;
