/**
 * Schema for xstate game machine
 */

import { StateSchema, State } from "xstate";
import { PlayerId } from "@trulyacerbic/ttt-apis/gmaster-api";

export interface GameContext {
    board: Array<Array<PlayerId | null>>;
    player1: PlayerId;
    player2: PlayerId;
    moves_made: number;
    last_move: any;
}

export interface GameSchema extends StateSchemaWithParallel<GameContext> {
    context: GameContext;
    type: "parallel";
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

interface StateSchemaWithParallel<TC = any> extends StateSchema<TC> {
    type?: "parallel";
    states?: {
        [key: string]: StateSchemaWithParallel<TC>;
    };
}

type KeysToLeafs<T extends {}> = {
    [K in keyof T]: T[K] extends { states: any } ? never : K;
}[keyof T];
type KeysToCompound<T> = Exclude<keyof T, KeysToLeafs<T>>;

// compound non-parallel states as one object with optional fields (like xstate original)
type ExtractStateTypeValues<
    T extends StateSchemaWithParallel,
    TSS = T["states"]
> =
    | (T["type"] extends "parallel"
          ? {
                [R in KeysToCompound<TSS>]: ExtractStateTypeValues<TSS[R]>;
            }
          : KeysToCompound<TSS> extends never
          ? never
          : {
                [R in KeysToCompound<TSS>]?: ExtractStateTypeValues<TSS[R]>;
            })
    | KeysToLeafs<TSS>;

export type GameStateValue = ExtractStateTypeValues<GameSchema>;

//// EVENTS

type GameEvent_MOVE = {
    type: "MOVE";
    playerId: PlayerId;
    move: {
        column: number;
        row: number;
    };
};

export type GameEvent = GameEvent_MOVE;

export type GameState = State<GameContext, GameEvent, GameSchema>;
