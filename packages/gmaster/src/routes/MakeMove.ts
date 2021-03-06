import * as express from "express";
import { State } from "xstate";
import { interpret } from "xstate/lib/interpreter";

import { DbConnector } from "../db/db";
import {
    GameId,
    MakeMoveRequest,
    MakeMoveResponse,
    APIResponseFailure,
    ErrorCodes
} from "@trulyacerbic/ttt-apis/gmaster-api";

import { GameContext, GameEvent, GameStateValue } from "../game/game-schema";
import { GameMachine, GameStateValueToApi } from "../game/game-machine";
import { makeFailureResponse } from "./utils";

const router = express.Router();
router.post("/MakeMove/:gameId", function (req, res, next) {
    const gameId = req.params.gameId as GameId;
    const gamesDb = req.app.get("gamesDb") as DbConnector;

    gamesDb
        .LoadGame(gameId)
        .then(game => {
            // restore the machine
            const state_detached = State.create<GameContext, GameEvent>(
                JSON.parse(game.state)
            );
            const state = GameMachine.resolveState(state_detached);
            const service = interpret(GameMachine).start(state);

            // read request data
            const request = req.body as MakeMoveRequest;
            const playerId = request.playerId;
            const column = request.move?.column;
            const row = request.move?.row;

            // Perform various checks on request data
            if (!state.matches("game.wait")) {
                const response: APIResponseFailure = {
                    success: false,
                    errorMessage: "Game already ended",
                    errorCode: ErrorCodes.GAME_ENDED_ALREADY
                };
                res.send(response);
                return;
            }
            let turn_player = ((state.value as any) as GameStateValue).turn!;
            if (state.context[turn_player] !== playerId) {
                const response: APIResponseFailure = {
                    success: false,
                    errorMessage: "Wrong player",
                    errorCode: ErrorCodes.ILLEGAL_MOVE
                };
                res.send(response);
                return;
            }
            if (
                !Number.isInteger(column) ||
                column < 0 ||
                column > 2 ||
                !Number.isInteger(row) ||
                row < 0 ||
                row > 2
            ) {
                const response: APIResponseFailure = {
                    success: false,
                    errorMessage:
                        "Move outside of board boundaries (0..2 x 0..2)",
                    errorCode: ErrorCodes.BAD_ARGUMENTS
                };
                res.send(response);
                return;
            }
            if (state.context.board[row][column] !== null) {
                const response: APIResponseFailure = {
                    success: false,
                    errorMessage: "Bad move - cell already taken",
                    errorCode: ErrorCodes.ILLEGAL_MOVE
                };
                res.send(response);
                return;
            }

            // advance the machine
            const new_state = service.send({
                type: "MOVE",
                move: { column, row },
                playerId
            });
            gamesDb
                .SaveGame(gameId, {
                    state: JSON.stringify(new_state)
                })
                .then(() => {
                    // wait for saving to finish and send result in reply
                    const response: MakeMoveResponse = {
                        success: true,
                        newState: Object.assign(
                            { id: gameId, meta: game.meta },
                            GameStateValueToApi(new_state)
                        )
                    };
                    res.send(response);
                })
                .catch(err => {
                    const response = makeFailureResponse(
                        err,
                        "Failed to save the new game state"
                    );
                    res.send(response);
                });
        })
        .catch(err => {
            const response: APIResponseFailure = makeFailureResponse(
                err,
                "Error while processing /MakeMove"
            );
            res.send(response);
        });
});

export default router;
