import * as express from "express";
import { Game, DbConnector } from "../db/db";
import {
    CreateGameRequest,
    CreateGameResponse,
    APIResponseFailure,
    ErrorCodes
} from "@trulyacerbic/ttt-apis/gmaster-api";
import { makeFailureResponse } from "./utils";

import { GameMachine, GameStateValueToApi } from "../game/game-machine";

const router = express.Router();

router.post("/CreateGame", function (req, res, next) {
    const {
        player1Id: player1,
        player2Id: player2,
        meta
    } = req.body as CreateGameRequest;
    const gamesDb = req.app.get("gamesDb") as DbConnector;

    if (
        typeof player1 !== "string" ||
        typeof player2 !== "string" ||
        player1.length < 1 ||
        player2.length < 1 ||
        player2 === player1
    ) {
        const response = makeFailureResponse(
            undefined,
            "Invalid arguments to create a new game",
            ErrorCodes.BAD_ARGUMENTS
        );
        res.send(response);
        return;
    }

    // Initial context for a new game
    const machineWithContext = GameMachine.withContext({
        player1,
        player2,
        // game board (3x3 table)
        board: [
            [null, null, null],
            [null, null, null],
            [null, null, null]
        ],
        // number of moves made so far
        moves_made: 0,
        // stores the move made by a player,
        // since each move creates 2 transitions, it helps to know what caused
        // it on the derived transitions
        last_move: null
    });

    const game: Game = {
        state: JSON.stringify(machineWithContext.initialState),
        player1,
        player2,
        meta: meta || null
    };

    gamesDb
        .CreateGame(game)
        .then(gameId => {
            const response: CreateGameResponse = {
                success: true,
                gameId: gameId,
                newState: Object.assign(
                    { id: gameId, meta: game.meta },
                    GameStateValueToApi(machineWithContext.initialState)
                )
            };
            res.send(response);
        })
        .catch(err => {
            const response = makeFailureResponse(
                err,
                "Failed to create a new game"
            );
            res.send(response);
        });
});

export default router;
