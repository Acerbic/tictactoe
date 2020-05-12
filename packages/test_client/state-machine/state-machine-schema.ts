/**
 * Definitions for state machine
 */

import { State, StateSchema } from "xstate";

type RoleChoice = "first" | "second";

/**
 * Abstraction that uses xstate actions to send signals to the game server and
 * uses signals back as xstate events
 */
export interface GameConnector {
    actions: {
        emit_iwannabetracer: (role: RoleChoice) => void;
        emit_move: (row: number, column: number) => void;

        // emit_connect: (playerId: string) => void;
        emit_dropgame: () => void;
    };
}

export interface ClientContext {
    gameConnector: GameConnector | null;
}

export interface ClientSchema extends StateSchema<ClientContext> {
    states: {
        initial: {};
        awaiting_connection: {};
        role_picking: {};
        waiting4opponent: {};
        game: {
            states: {
                our_turn: {
                    states: {
                        thinking: {};
                        moved: {};
                    };
                };
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

export type S_ConnectedEvent = {
    type: "S_CONNECTED";
};
export type S_ReconnectedEvent = {
    type: "S_RECONNECTED";
    isMyTurn: boolean;
};

// export type S_RoomDroppedEvent = {
//     type: "ROOM_DROPPED";
// };
export type UI_RolePickedEvent = {
    type: "UI_ROLE_PICKED";
    role: "first" | "second";
};
export type S_GameStartEvent = {
    type: "S_GAME_START";
    role: "first" | "second";
};
export type UI_MoveChosenEvent = {
    type: "UI_MOVE_CHOSEN";
    row: number;
    column: number;
};
export type S_NextTurnEvent = {
    type: "S_NEXT_TURN";
};
export type S_GameEndEvent = {
    type: "S_GAME_END";
    outcome: "win" | "fail" | "meh";
};

export type UI_NewGameEvent = {
    type: "UI_NEW_GAME";
    connection: GameConnector;
};
// as if page reset, disconnecting
// export type ResetEvent = {
//     type: "RESET";
// };

/**
 * Grouping of events that come from React
 * (due to user interactions)
 */
export type UI_Event =
    | UI_NewGameEvent
    | UI_RolePickedEvent
    | UI_MoveChosenEvent;

/**
 * Events originating from the game server messages
 */
export type Server_Event =
    // | S_RoomDroppedEvent
    | S_ConnectedEvent
    | S_ReconnectedEvent
    | S_GameStartEvent
    | S_NextTurnEvent
    | S_GameEndEvent;

export type ClientEvent = UI_Event | Server_Event;

export type ClientEventSender = (
    e: ClientEvent
) => State<ClientContext, ClientEvent, ClientSchema>;
