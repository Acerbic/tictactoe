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
    const { player1Id, player2Id } = req.body as CreateGameRequest;
    const gamesDb = req.app.get("gamesDb") as DbConnector;

    if (
        typeof player1Id !== "string" ||
        typeof player2Id !== "string" ||
        player1Id.length < 1 ||
        player2Id.length < 1 ||
        player2Id === player1Id
    ) {
        // TODO: replace with a proper error code
        const response = makeFailureResponse(
            undefined,
            "Invalid arguments to create a new game",
            ErrorCodes.BAD_ARGUMENTS
        );
        res.send(response);
        return;
    }

    const game: Game = {
        state: JSON.stringify(GameMachine.initialState),
        player1: player1Id,
        player2: player2Id,

        board: JSON.stringify(GameMachine.initialState.context.board)
    };

    gamesDb
        .CreateGame(game)
        .then(gameId => {
            const response: CreateGameResponse = {
                success: true,
                gameId: gameId,
                newState: GameStateValueToApi(GameMachine.initialState)
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
