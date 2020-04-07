import * as express from "express";
import { Game, DbConnector } from "../db/db";
import {
    CreateGameRequest,
    CreateGameResponse,
    APIResponseFailure
} from "./api";

import { GameMachine } from "../game/game-machine";

var router = express.Router();

router.post("/CreateGame", function(req, res, next) {
    const { player1Id, player2Id } = req.body as CreateGameRequest;
    const gamesDb = (req.app as any).gamesDb as DbConnector;

    if (player1Id && player2Id) {
        const game: Game = {
            state: JSON.stringify(GameMachine.initialState),
            player1: player1Id,
            player2: player2Id,

            board: JSON.stringify(GameMachine.initialState.context.board)
        };

        gamesDb.CreateGame(game).then(gameId => {
            const response: CreateGameResponse = {
                success: true,
                gameId: gameId
            };
            res.send(response);
        });
    } else {
        const response: APIResponseFailure = {
            success: false,
            errorMessage: "Failed to create a new game",
            errorCode: 0 // TODO: replace with a proper code
        };
        res.send(response);
    }
});

module.exports = router;
