import * as xstate from "xstate";

import {
    GameContext,
    GameSchema,
    GameEvent,
    GameStateValue
} from "./game-schema";
import { GameState, GameBoard } from "@trulyacerbic/ttt-apis/gmaster-api";

export const GameMachine = xstate.Machine<GameContext, GameSchema, GameEvent>(
    {
        id: "tictactoe",
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
                        always: [
                            { target: "over", cond: "isGameOver" },
                            { target: "draw", cond: "isGameDraw" },
                            { target: "wait" }
                        ]
                    },
                    draw: { type: "final" },
                    over: { type: "final" }
                }
            }
        }
    },
    {
        actions: {
            applyMove: xstate.assign((ctx: GameContext, event: any) => {
                return {
                    board: ctx.board.map((row, i) =>
                        row.map((value, j) =>
                            event.move.row === i && event.move.column === j
                                ? event.playerId
                                : value
                        )
                    ) as GameBoard,
                    moves_made: ctx.moves_made + 1,
                    last_move: event
                };
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
): Omit<GameState, "id" | "meta"> {
    const sv = state.value as GameStateValue;

    return {
        player1: state.context.player1,
        player2: state.context.player2,
        turn: sv.turn,
        board: state.context.board,
        game: sv.game as Exclude<GameStateValue["game"], "thinking">
    };
}
