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
export type RolePickedEvent = {
    type: "ROLE_PICKED";
    role: "first" | "second";
};
export type GameStartEvent = {
    type: "GAME_START";
    role: "first" | "second";
};
export type MoveChosenEvent = {
    type: "MOVE_CHOSEN";
    row: number;
    column: number;
};
type NextTurnEvent = {
    type: "NEXT_TURN";
};
export type GameEndEvent = {
    type: "GAME_END";
    outcome: "win" | "fail" | "meh";
};

export type NewGameEvent = {
    type: "NEW_GAME";
    connection: GameConnector;
};
// as if page reset, disconnecting
type ResetEvent = {
    type: "RESET";
};
// type ConnectionInitiatedEvent = {
//     type: "CONNECTION_INITIATED";
//     socket: SocketIOClient.Socket | ServerCommunicator;
// };

export type ClientEvent =
    | RoomDroppedEvent
    // | ConnectionInitiatedEvent
    | ConnectedEvent
    | ReconnectedEvent
    | RolePickedEvent
    | GameStartEvent
    | MoveChosenEvent
    | NextTurnEvent
    | GameEndEvent
    | NewGameEvent
    | ResetEvent;

export type ClientEventSender = (
    e: ClientEvent
) => State<ClientContext, ClientEvent, ClientSchema>;
