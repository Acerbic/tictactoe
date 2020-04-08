/**
 * Schema for xstate game machine
 */

import { StateSchema } from "xstate";
import { PlayerId } from "../routes/api";

export interface GameContext {
    board: Array<Array<any>>;
    moves_made: number;
    last_move: any;
}

export interface GameSchema extends StateSchema<GameContext> {
    context: GameContext;
    states: {
        turn: {
            states: {
                player1: {};
                player2: {};
            };
        };
        game: {
            states: {
                wait: {};
                thinking: {};
                draw: {};
                over: {};
            };
        };
    };
}

//// EVENTS

type GameEvent_MOVE = {
    type: "MOVE";
    playerId: PlayerId;
    move: {
        column: number;
        row: number;
    };
};

type GameEvent_KOVALSKY = {
    type: "KOVALSKY";
};

type PlayerEvent_NEXTMOVE = {
    type: "NEXTMOVE";
};

export type GameEvent =
    | GameEvent_MOVE
    | GameEvent_KOVALSKY
    | PlayerEvent_NEXTMOVE;
