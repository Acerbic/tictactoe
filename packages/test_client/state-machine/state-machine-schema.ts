import { StateSchema, AnyEventObject } from "xstate";

export interface ClientContext {}

export interface ClientSchema extends StateSchema<ClientContext> {
    states: {
        initial: {};
        role_picking: {};
        waiting4opponent: {};
        game: {
            states: {
                our_turn: {};
                their_turn: {};
            };
        };

        end_draw: {};
        end_victory: {};
        end_defeat: {};
    };
}

type ConnectedEvent = {
    type: "CONNECTED";
};
type RoomDroppedEvent = {
    type: "ROOM_DROPPED";
};
type RolePicked = {
    type: "ROLE_PICKED";
};
export type GameStartEvent = {
    type: "GAME_START";
    role: "first" | "second";
};
type NextTurnEvent = {
    type: "NEXT_TURN";
};
export type GameEndEvent = {
    type: "GAME_END";
    outcome: "win" | "fail" | "meh";
};

export type ClientEvent =
    | RoomDroppedEvent
    | ConnectedEvent
    | RolePicked
    | GameStartEvent
    | NextTurnEvent
    | GameEndEvent;
