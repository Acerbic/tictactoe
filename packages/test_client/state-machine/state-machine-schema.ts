import { StateSchema, AnyEventObject } from "xstate";

export interface ClientContext {}

export interface ClientSchema extends StateSchema<ClientContext> {
    states: {
        initial: {};
        awaiting_connection: {};
        role_picking: {};
        waiting4opponent: {};
        game: {
            states: {
                our_turn: {};
                their_turn: {};
            };
        };

        end: {
            states: {
                draw: {};
                victory: {};
                defeat: {};
            };
        };
    };
}

type ConnectedEvent = {
    type: "CONNECTED";
};
export type ReconnectedEvent = {
    type: "RECONNECTED";
    isMyTurn: boolean;
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

type NewGameEvent = {
    type: "NEW_GAME";
};
// as if page reset, disconnecting
type ResetEvent = {
    type: "RESET";
};
type ConnectionInitiatedEvent = {
    type: "CONNECTION_INITIATED";
};

export type ClientEvent =
    | RoomDroppedEvent
    | ConnectionInitiatedEvent
    | ConnectedEvent
    | ReconnectedEvent
    | RolePicked
    | GameStartEvent
    | NextTurnEvent
    | GameEndEvent
    | NewGameEvent
    | ResetEvent;
