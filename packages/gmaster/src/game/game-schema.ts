/**
 * Schema for xstate game machine
 */

import { StateSchema, ExtractStateValue } from "xstate";
import { PlayerId } from "../routes/api";

export interface GameContext {
    board: Array<Array<any>>;
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

type S = { states: any };
type KeysToLeafs<T extends {}> = {
    [K in keyof T]: T[K] extends S ? never : K;
}[keyof T];
type KeysToCompound<T> = Exclude<keyof T, KeysToLeafs<T>>;
type UnionizedPairs<T extends any, K = keyof T> = K extends string
    ? { [P in K]?: T[K] }
    : never;
type ParallelCompound_<TSS> = {
    [R in KeysToCompound<TSS>]: ExtractStateTypeValues_<TSS[R]>;
};
type AlternatingCompound_<TSS> = UnionizedPairs<
    {
        [R in KeysToCompound<TSS>]?: ExtractStateTypeValues_<TSS[R]>;
    }
>;

// idealized
type ExtractStateTypeValues_<
    T extends StateSchemaWithParallel,
    TSS = T["states"]
> = TSS extends never
    ? never
    :
          | (T["type"] extends "parallel"
                ? ParallelCompound_<TSS>
                : AlternatingCompound_<TSS>)
          | KeysToLeafs<TSS>;

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
export type GameStateValue_ = ExtractStateTypeValues_<GameSchema>;

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
