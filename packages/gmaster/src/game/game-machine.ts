import * as xstate from "xstate";

import {
    GameContext,
    GameSchema,
    GameEvent,
    GameStateValue
} from "./game-schema";
import { GameState } from "../routes/api";

export const GameMachine = xstate.Machine<GameContext, GameSchema, GameEvent>(
    {
        id: "tictactoe",
        context: {
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
        },
        type: "parallel",
        states: {
            /**
             * since game is symmetrical for players (same rules), we just track
             * who's turn it is in as separate machine
             */
            turn: {
                initial: "player1",
                states: {
                    player1: { on: { MOVE: "player2" } },
                    player2: { on: { MOVE: "player1" } }
                }
            },

            /* Actual internal logic of the game */
            game: {
                initial: "wait",
                states: {
                    wait: {
                        on: {
                            MOVE: {
                                target: "thinking",
                                actions: "applyMove"
                            }
                        }
                    },

                    thinking: {
                        on: {
                            "": [
                                { target: "over", cond: "isGameOver" },
                                { target: "draw", cond: "isGameDraw" },
                                { target: "wait" }
                            ]
                        }
                    },
                    draw: { type: "final" },
                    over: { type: "final" }
                }
            }
        }
    },
    {
        actions: {
            applyMove: xstate.actions.assign({
                board: (ctx: GameContext, event: any) => {
                    // not sure, should I make a copy of the board object?
                    ctx.board[event.move.row][event.move.column] =
                        event.playerId;
                    return ctx.board;
                },
                moves_made: (ctx: GameContext) => ctx.moves_made + 1,
                last_move: (ctx: GameContext, event: any) => event
            })
        },
        guards: {
            isGameOver: condGameOver,
            isGameDraw: condDraw
        }
    }
);

/**
 * Conditional guard - checks if after this move the player won and game is over
 */
function condGameOver({ board, last_move }: GameContext) {
    const move = last_move.move;
    const currentPlayerTag = board[move.row][move.column];
    if (!currentPlayerTag) {
        throw new Error(
            "bad player's tag on board during guard check: " +
                String(currentPlayerTag)
        );
    }

    // check row
    if (
        currentPlayerTag == board[move.row][0] &&
        currentPlayerTag == board[move.row][1] &&
        currentPlayerTag == board[move.row][2]
    ) {
        return true;
    }
    // check column
    if (
        currentPlayerTag == board[0][move.column] &&
        currentPlayerTag == board[1][move.column] &&
        currentPlayerTag == board[2][move.column]
    ) {
        return true;
    }
    // main diagonal
    if (
        move.row == move.column &&
        board[0][0] == board[1][1] &&
        board[1][1] == board[2][2]
    ) {
        return true;
    }
    // second diagonal
    if (
        move.row == 2 - move.column &&
        board[0][2] == board[1][1] &&
        board[1][1] == board[2][0]
    ) {
        return true;
    }

    return false;
}

/**
 * Conditional transition guard.
 * Checks if the game ended in draw and there's no move moves to make.
 */
function condDraw(ctx: GameContext) {
    return ctx.moves_made == 9;
}

/**
 * Converts from game machine state value to API data structure
 */
export function GameStateValueToApi(
    state: xstate.State<GameContext, GameEvent, GameSchema>
): GameState {
    const sv = state.value as GameStateValue;

    return {
        turn: sv.turn,
        game: sv.game as Exclude<GameStateValue["game"], "thinking">
    };
}
