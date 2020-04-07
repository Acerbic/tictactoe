import * as express from "express";
import * as xstate from "xstate";
import { GameId, Game, DbConnector } from "../db/db.js";
import { MakeMoveRequest, MakeMoveResponse } from "gmasterREST";

const router = express.Router();

import { interpret } from "xstate/lib/interpreter";
import { GameContext, GameMachine, GameSchema } from "../game/game-machine";

router.post("/MakeMove/:gameId", function(req, res, next) {
    const gameId = req.params.gameId as GameId;
    const gamesDb = (req.app as any).gamesDb as DbConnector;

    gamesDb
        .LoadGame(gameId)
        .then(game => {
            // restore the machine
            const state_detached = xstate.State.create<GameContext>(
                JSON.parse(game.state)
            );
            const state = GameMachine.resolveState(state_detached);
            const service = interpret(GameMachine).start(state);

            // read request data
            const request = req.body as MakeMoveRequest;
            const playerId = request.playerId;
            const column = request.move && request.move.column;
            const row = request.move && request.move.row;

            // Perform various checks on request data
            // if ((current_state.value as xstate.StateValueMap).game !== "wait") {

            if (!state.matches("game.wait")) {
                const response: MakeMoveResponse = {
                    newState: state.value,
                    success: false,
                    errorMessage: "Game already ended",
                    errorCode: 0 // TODO: replace with a regular code
                };
                res.send(response);
            }
            if (
                game[(state.value as any).turn as "player1" | "player2"] !==
                playerId
            ) {
                const response: MakeMoveResponse = {
                    newState: state.value,
                    success: false,
                    errorMessage: "Wrong player",
                    errorCode: 0 // TODO: replace with a regular code
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
                const response: MakeMoveResponse = {
                    newState: state.value,
                    success: false,
                    errorMessage: "Malformed move",
                    errorCode: 0 // TODO: replace with a regular code
                };
                res.send(response);
                return;
            }
            if (state.context.board[row][column] !== null) {
                const response: MakeMoveResponse = {
                    newState: state.value,
                    success: false,
                    errorMessage: "Bad move - cell already taken",
                    errorCode: 0 // TODO: replace with a regular code
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
                    state: JSON.stringify(new_state),
                    board: JSON.stringify(new_state.context.board)
                })
                .then(() => {
                    // wait for saving to finish and
                    // send result in reply
                    const response: MakeMoveResponse = {
                        success: true,
                        newState: new_state.value
                    };
                    res.send(response);
                });
            return;
        })
        .catch(ex => {
            const response: MakeMoveResponse = {
                newState: null,
                success: false,
                errorMessage: "Game was not loaded from DB: " + ex,
                errorCode: 0 // TODO: replace with a regular code
            };
            res.send(response);
            return;
        });
});

module.exports = router;
